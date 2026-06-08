#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import datetime as dt
import json
import re
import sys
import time
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any


MAX_PROGRESS_JSON_BYTES = 300_000
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
DEFAULT_BACKUP_DIR = BACKEND_DIR / "migration-backups"
SAMCONFIG_PATH = BACKEND_DIR / "samconfig.toml"


class MigrationError(Exception):
    pass


@dataclass(frozen=True)
class CognitoUser:
    username: str
    attributes: dict[str, str]
    enabled: bool | None = None
    status: str | None = None

    @property
    def sub(self) -> str | None:
        return self.attributes.get("sub")

    @property
    def email(self) -> str | None:
        return self.attributes.get("email")

    @property
    def email_verified(self) -> bool:
        return is_truthy_string(self.attributes.get("email_verified"))


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    try:
        run(args)
    except MigrationError as error:
        print(f"Migration aborted: {error}", file=sys.stderr)
        return 2

    return 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    defaults = read_samconfig_defaults()
    parser = argparse.ArgumentParser(
        description=(
            "Merge legacy federated Cognito learning progress into the email/password "
            "profile and optionally relink the provider identity."
        )
    )
    parser.add_argument("--email", required=True, help="Account email to migrate.")
    parser.add_argument(
        "--provider",
        default="Google",
        help="Cognito identity provider name for the duplicate user. Default: Google.",
    )
    parser.add_argument(
        "--source-username",
        help="Federated duplicate Cognito username, for example Google_1234567890.",
    )
    parser.add_argument(
        "--destination-username",
        help="Existing email/password Cognito username. Defaults to the normalized email.",
    )
    parser.add_argument(
        "--provider-subject",
        help="Provider subject value to link. Defaults to the source username suffix.",
    )
    parser.add_argument("--user-pool-id", help="Cognito user pool ID. Defaults to stack output.")
    parser.add_argument(
        "--progress-table",
        help="DynamoDB learning progress table name. Defaults to stack output.",
    )
    parser.add_argument(
        "--stack-name",
        default=defaults.get("stack_name", "smile-learning-backend"),
        help="CloudFormation stack name used to resolve missing IDs.",
    )
    parser.add_argument(
        "--region",
        default=defaults.get("region"),
        help="AWS region. Defaults to samconfig.toml or AWS config.",
    )
    parser.add_argument(
        "--profile",
        default=defaults.get("profile"),
        help="AWS profile. Defaults to samconfig.toml when present.",
    )
    parser.add_argument(
        "--backup-dir",
        default=DEFAULT_BACKUP_DIR,
        type=Path,
        help=f"Local backup directory. Default: {DEFAULT_BACKUP_DIR}",
    )
    parser.add_argument(
        "--skip-backup",
        action="store_true",
        help="Do not write a local backup JSON file before applying.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write the merged progress and perform requested destructive actions.",
    )
    parser.add_argument(
        "--relink-provider",
        action="store_true",
        help=(
            "Delete the duplicate federated Cognito user and link the provider identity "
            "to the destination user. Requires --apply."
        ),
    )
    parser.add_argument(
        "--delete-source-progress",
        action="store_true",
        help="Delete the old source progress item after the destination progress is written.",
    )
    parser.add_argument(
        "--require-source-email-verified",
        action="store_true",
        help="Fail when the source federated user does not have email_verified=true.",
    )
    parser.add_argument(
        "--allow-missing-source-email-verified",
        action="store_true",
        help=(
            "Allow non-Google source users whose email_verified attribute is missing. "
            "A present false value still fails."
        ),
    )
    parser.add_argument(
        "--allow-unverified-source-email",
        action="store_true",
        help=(
            "Allow a legacy source federated user whose Cognito email_verified attribute "
            "is false. Use only after independently checking the provider owns the email."
        ),
    )

    return parser.parse_args(argv)


def read_samconfig_defaults() -> dict[str, str]:
    if not SAMCONFIG_PATH.exists():
        return {}

    with SAMCONFIG_PATH.open("rb") as config_file:
        config = tomllib.load(config_file)

    parameters = config.get("default", {}).get("global", {}).get("parameters", {})
    return {key: value for key, value in parameters.items() if isinstance(value, str)}


def run(args: argparse.Namespace) -> None:
    if args.relink_provider and not args.apply:
        raise MigrationError("--relink-provider requires --apply.")
    if args.delete_source_progress and not args.apply:
        raise MigrationError("--delete-source-progress requires --apply.")

    email = normalize_email(args.email)
    provider = args.provider.strip()
    if not provider:
        raise MigrationError("--provider cannot be empty.")

    session = create_aws_session(profile=args.profile, region=args.region)
    cognito = session.client("cognito-idp")
    dynamodb = session.client("dynamodb")

    user_pool_id = args.user_pool_id
    progress_table = args.progress_table
    if not user_pool_id or not progress_table:
        outputs = get_stack_outputs(session, stack_name=args.stack_name)
        user_pool_id = user_pool_id or require_stack_output(outputs, "CognitoUserPoolId")
        progress_table = progress_table or require_stack_output(
            outputs, "LearningProgressTableName"
        )

    users_by_email = list_cognito_users_by_email(cognito, user_pool_id=user_pool_id, email=email)
    destination_user = select_destination_user(
        cognito,
        user_pool_id=user_pool_id,
        email=email,
        users_by_email=users_by_email,
        destination_username=args.destination_username,
    )
    source_user = select_source_user(
        cognito,
        user_pool_id=user_pool_id,
        provider=provider,
        users_by_email=users_by_email,
        source_username=args.source_username,
    )
    warnings = validate_user_pair(
        email=email,
        provider=provider,
        source_user=source_user,
        destination_user=destination_user,
        require_source_email_verified=args.require_source_email_verified,
        allow_missing_source_email_verified=args.allow_missing_source_email_verified,
        allow_unverified_source_email=args.allow_unverified_source_email,
    )

    destination_sub = require_user_sub(destination_user, label="destination")
    source_sub = require_user_sub(source_user, label="source")
    if source_sub == destination_sub:
        raise MigrationError("Source and destination users already have the same sub.")

    provider_subject = args.provider_subject or get_provider_subject_from_username(
        source_user.username, provider=provider
    )

    destination_item = get_progress_item(
        dynamodb, table_name=progress_table, user_sub=destination_sub
    )
    source_item = get_progress_item(dynamodb, table_name=progress_table, user_sub=source_sub)
    destination_progress = read_progress_from_item(destination_item, label="destination")
    source_progress = read_progress_from_item(source_item, label="source")
    merged_progress = merge_progress_for_migration(destination_progress, source_progress)
    merged_progress_json = json.dumps(merged_progress, separators=(",", ":"))
    if len(merged_progress_json.encode("utf-8")) > MAX_PROGRESS_JSON_BYTES:
        raise MigrationError("Merged learning progress is larger than the backend limit.")

    backup_path = None
    if not args.skip_backup:
        backup_path = write_backup(
            backup_dir=args.backup_dir,
            email=email,
            provider=provider,
            user_pool_id=user_pool_id,
            progress_table=progress_table,
            destination_user=destination_user,
            source_user=source_user,
            destination_item=destination_item,
            source_item=source_item,
            merged_progress=merged_progress,
            provider_subject=provider_subject,
        )

    print_migration_summary(
        apply=args.apply,
        backup_path=backup_path,
        destination_progress=destination_progress,
        destination_sub=destination_sub,
        destination_user=destination_user,
        merged_progress=merged_progress,
        provider=provider,
        provider_subject=provider_subject,
        relink_provider=args.relink_provider,
        source_progress=source_progress,
        source_sub=source_sub,
        source_user=source_user,
        warnings=warnings,
    )

    if not args.apply:
        print("Dry run only. Re-run with --apply to write AWS changes.")
        return

    updated_at = int(time.time())
    put_progress_item(
        dynamodb,
        table_name=progress_table,
        user_sub=destination_sub,
        progress_json=merged_progress_json,
        updated_at=updated_at,
    )
    print(f"Wrote merged progress to destination sub {destination_sub} at {updated_at}.")

    if args.relink_provider:
        relink_provider_identity(
            cognito,
            user_pool_id=user_pool_id,
            destination_username=destination_user.username,
            source_username=source_user.username,
            provider=provider,
            provider_subject=provider_subject,
        )
        print(f"Relinked {provider} provider identity to {destination_user.username}.")

    if args.delete_source_progress:
        if source_item:
            delete_progress_item(dynamodb, table_name=progress_table, user_sub=source_sub)
            print(f"Deleted old source progress item for sub {source_sub}.")
        else:
            print("Skipped source progress delete because no source progress item exists.")


def create_aws_session(*, profile: str | None, region: str | None):
    try:
        import boto3
    except ImportError as error:
        raise MigrationError("boto3 is required. Install backend requirements first.") from error

    session_kwargs: dict[str, str] = {}
    if profile:
        session_kwargs["profile_name"] = profile
    if region:
        session_kwargs["region_name"] = region

    return boto3.Session(**session_kwargs)


def get_stack_outputs(session: Any, *, stack_name: str | None) -> dict[str, str]:
    if not stack_name:
        raise MigrationError(
            "Provide --stack-name or pass both --user-pool-id and --progress-table."
        )

    cloudformation = session.client("cloudformation")
    response = cloudformation.describe_stacks(StackName=stack_name)
    stacks = response.get("Stacks") or []
    if not stacks:
        raise MigrationError(f"CloudFormation stack not found: {stack_name}")

    outputs = stacks[0].get("Outputs") or []
    return {
        output["OutputKey"]: output["OutputValue"]
        for output in outputs
        if output.get("OutputKey") and output.get("OutputValue")
    }


def require_stack_output(outputs: dict[str, str], key: str) -> str:
    value = outputs.get(key)
    if not value:
        raise MigrationError(f"CloudFormation output is missing: {key}")
    return value


def list_cognito_users_by_email(
    cognito: Any, *, user_pool_id: str, email: str
) -> list[CognitoUser]:
    escaped_email = email.replace("\\", "\\\\").replace('"', '\\"')
    paginator = cognito.get_paginator("list_users")
    users: list[CognitoUser] = []

    for page in paginator.paginate(
        UserPoolId=user_pool_id,
        Filter=f'email = "{escaped_email}"',
    ):
        users.extend(cognito_user_from_list_user(user) for user in page.get("Users", []))

    return users


def select_destination_user(
    cognito: Any,
    *,
    user_pool_id: str,
    email: str,
    users_by_email: list[CognitoUser],
    destination_username: str | None,
) -> CognitoUser:
    if destination_username:
        return require_cognito_user(
            cognito, user_pool_id=user_pool_id, username=destination_username.strip()
        )

    user = get_cognito_user(cognito, user_pool_id=user_pool_id, username=email)
    if user:
        return user

    candidates = [
        user for user in users_by_email if not looks_like_federated_username(user.username)
    ]
    if len(candidates) == 1:
        return require_cognito_user(
            cognito, user_pool_id=user_pool_id, username=candidates[0].username
        )

    raise MigrationError(
        "Could not select the destination email/password user. Pass --destination-username."
    )


def select_source_user(
    cognito: Any,
    *,
    user_pool_id: str,
    provider: str,
    users_by_email: list[CognitoUser],
    source_username: str | None,
) -> CognitoUser:
    if source_username:
        return require_cognito_user(
            cognito, user_pool_id=user_pool_id, username=source_username.strip()
        )

    candidates = [
        user for user in users_by_email if username_has_provider_prefix(user.username, provider)
    ]
    if len(candidates) == 1:
        return require_cognito_user(
            cognito, user_pool_id=user_pool_id, username=candidates[0].username
        )

    if not candidates:
        raise MigrationError(
            f"No {provider} duplicate user found for this email. Pass --source-username."
        )

    candidate_names = ", ".join(user.username for user in candidates)
    raise MigrationError(
        f"Multiple {provider} duplicate users found ({candidate_names}). Pass --source-username."
    )


def require_cognito_user(cognito: Any, *, user_pool_id: str, username: str) -> CognitoUser:
    user = get_cognito_user(cognito, user_pool_id=user_pool_id, username=username)
    if not user:
        raise MigrationError(f"Cognito user not found: {username}")
    return user


def get_cognito_user(cognito: Any, *, user_pool_id: str, username: str) -> CognitoUser | None:
    try:
        response = cognito.admin_get_user(UserPoolId=user_pool_id, Username=username)
    except Exception as error:
        if get_aws_error_code(error) == "UserNotFoundException":
            return None
        raise

    return cognito_user_from_admin_get_user(response)


def cognito_user_from_admin_get_user(response: dict[str, Any]) -> CognitoUser:
    return CognitoUser(
        attributes=parse_cognito_attributes(response.get("UserAttributes", [])),
        enabled=response.get("Enabled"),
        status=response.get("UserStatus"),
        username=response["Username"],
    )


def cognito_user_from_list_user(response: dict[str, Any]) -> CognitoUser:
    return CognitoUser(
        attributes=parse_cognito_attributes(response.get("Attributes", [])),
        enabled=response.get("Enabled"),
        status=response.get("UserStatus"),
        username=response["Username"],
    )


def parse_cognito_attributes(attributes: list[dict[str, str]]) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for attribute in attributes:
        name = attribute.get("Name")
        value = attribute.get("Value")
        if name and value is not None:
            parsed[name] = value
    return parsed


def validate_user_pair(
    *,
    email: str,
    provider: str,
    source_user: CognitoUser,
    destination_user: CognitoUser,
    require_source_email_verified: bool,
    allow_missing_source_email_verified: bool,
    allow_unverified_source_email: bool,
) -> list[str]:
    warnings: list[str] = []

    if normalize_email(destination_user.email or "") != email:
        raise MigrationError("Destination user email does not match the requested email.")
    if not destination_user.email_verified:
        raise MigrationError("Destination email/password user must have email_verified=true.")

    if normalize_email(source_user.email or "") != email:
        raise MigrationError("Source federated user email does not match the requested email.")

    source_email_verified = source_user.attributes.get("email_verified")
    if source_email_verified is None:
        if require_source_email_verified:
            raise MigrationError("Source federated user is missing email_verified.")
        if provider.lower() == "google" or allow_missing_source_email_verified:
            warnings.append(
                "Source federated user is missing email_verified; continuing because the "
                "email matches and this is an explicit admin migration."
            )
        else:
            raise MigrationError(
                "Source federated user is missing email_verified. Pass "
                "--allow-missing-source-email-verified only after checking the provider email."
            )
    elif not is_truthy_string(source_email_verified):
        if allow_unverified_source_email and not require_source_email_verified:
            warnings.append(
                "Source federated user has email_verified=false in Cognito; continuing "
                "because --allow-unverified-source-email was explicitly provided."
            )
            return warnings
        raise MigrationError("Source federated user has email_verified=false.")

    return warnings


def get_provider_subject_from_username(username: str, *, provider: str) -> str:
    prefix, separator, provider_subject = username.partition("_")
    if separator != "_" or prefix.lower() != provider.lower() or not provider_subject:
        raise MigrationError(
            "Could not infer provider subject from source username. Pass --provider-subject."
        )
    return provider_subject


def require_user_sub(user: CognitoUser, *, label: str) -> str:
    if not user.sub:
        raise MigrationError(f"{label.capitalize()} user is missing Cognito sub.")
    return user.sub


def get_progress_item(dynamodb: Any, *, table_name: str, user_sub: str) -> dict[str, Any] | None:
    response = dynamodb.get_item(
        TableName=table_name,
        Key={"userId": {"S": user_sub}},
        ConsistentRead=True,
    )
    return response.get("Item")


def read_progress_from_item(
    item: dict[str, Any] | None, *, label: str
) -> dict[str, Any] | None:
    if not item:
        return None

    raw_progress = item.get("progressJson", {}).get("S")
    if not isinstance(raw_progress, str):
        raise MigrationError(f"{label.capitalize()} progress item is missing progressJson.")

    try:
        progress = json.loads(raw_progress)
    except json.JSONDecodeError as error:
        raise MigrationError(f"{label.capitalize()} progressJson is not valid JSON.") from error

    if not is_valid_learning_progress(progress):
        raise MigrationError(f"{label.capitalize()} progressJson is not a valid progress payload.")

    return normalize_learning_progress(progress)


def merge_progress_for_migration(
    destination_progress: dict[str, Any] | None,
    source_progress: dict[str, Any] | None,
) -> dict[str, Any]:
    destination = normalize_learning_progress(destination_progress or create_initial_progress())
    source = normalize_learning_progress(source_progress or create_initial_progress())

    attempts = merge_attempts(
        destination.get("attempts", {}),
        source.get("attempts", {}),
    )
    submitted_exercise_answers = merge_submitted_exercise_answers(
        attempts=attempts,
        destination_answers=destination.get("submittedExerciseAnswers", {}),
        destination_attempts=destination.get("attempts", {}),
        source_answers=source.get("submittedExerciseAnswers", {}),
        source_attempts=source.get("attempts", {}),
    )

    merged = {
        "attempts": attempts,
        "completedLessonIds": dedupe_preserving_order(
            [
                *destination.get("completedLessonIds", []),
                *source.get("completedLessonIds", []),
            ]
        ),
        "lessonAnswers": {
            **destination.get("lessonAnswers", {}),
            **source.get("lessonAnswers", {}),
        },
        "submittedExerciseAnswers": submitted_exercise_answers,
        "version": 1,
    }
    current_lesson_id = source.get("currentLessonId") or destination.get("currentLessonId")
    if current_lesson_id:
        merged["currentLessonId"] = current_lesson_id
    return merged


def create_initial_progress() -> dict[str, Any]:
    return {
        "attempts": {},
        "completedLessonIds": [],
        "lessonAnswers": {},
        "submittedExerciseAnswers": {},
        "version": 1,
    }


def normalize_learning_progress(progress: dict[str, Any]) -> dict[str, Any]:
    normalized = copy.deepcopy(progress)
    normalized["attempts"] = normalized.get("attempts") or {}
    normalized["completedLessonIds"] = normalized.get("completedLessonIds") or []
    normalized["lessonAnswers"] = normalized.get("lessonAnswers") or {}
    normalized["submittedExerciseAnswers"] = normalized.get("submittedExerciseAnswers") or {}
    normalized["version"] = 1
    return normalized


def is_valid_learning_progress(value: Any) -> bool:
    if not isinstance(value, dict):
        return False
    if value.get("version") != 1:
        return False
    completed_lesson_ids = value.get("completedLessonIds")
    if not isinstance(completed_lesson_ids, list) or not all(
        isinstance(lesson_id, str) for lesson_id in completed_lesson_ids
    ):
        return False
    for dict_key in ("attempts", "lessonAnswers", "submittedExerciseAnswers"):
        field_value = value.get(dict_key)
        if field_value is not None and not isinstance(field_value, dict):
            return False
    current_lesson_id = value.get("currentLessonId")
    return current_lesson_id is None or isinstance(current_lesson_id, str)


def merge_attempts(
    destination_attempts: dict[str, Any],
    source_attempts: dict[str, Any],
) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    for attempt_id in [*destination_attempts.keys(), *source_attempts.keys()]:
        if attempt_id in merged:
            continue
        next_attempt = choose_attempt(
            destination_attempts.get(attempt_id),
            source_attempts.get(attempt_id),
        )
        if next_attempt:
            merged[attempt_id] = next_attempt
    return merged


def merge_submitted_exercise_answers(
    *,
    attempts: dict[str, Any],
    destination_answers: dict[str, Any],
    destination_attempts: dict[str, Any],
    source_answers: dict[str, Any],
    source_attempts: dict[str, Any],
) -> dict[str, Any]:
    answers: dict[str, Any] = {}
    exercise_ids = [*destination_answers.keys(), *source_answers.keys()]
    for exercise_id in exercise_ids:
        if exercise_id in answers:
            continue

        destination_answer = destination_answers.get(exercise_id)
        source_answer = source_answers.get(exercise_id)
        winning_attempt = attempts.get(exercise_id)

        if not source_answer:
            if destination_answer:
                answers[exercise_id] = destination_answer
            continue

        if not destination_answer:
            answers[exercise_id] = source_answer
            continue

        source_attempt = source_attempts.get(exercise_id)
        destination_attempt = destination_attempts.get(exercise_id)
        if winning_attempt == source_attempt or is_attempt_newer(
            source_attempt, destination_attempt
        ):
            answers[exercise_id] = source_answer
        else:
            answers[exercise_id] = destination_answer

    return answers


def choose_attempt(destination_attempt: Any, source_attempt: Any) -> Any:
    if not destination_attempt:
        return source_attempt
    if not source_attempt:
        return destination_attempt
    if is_attempt_newer(source_attempt, destination_attempt):
        return source_attempt
    if is_attempt_newer(destination_attempt, source_attempt):
        return destination_attempt
    if get_attempt_score(source_attempt) >= get_attempt_score(destination_attempt):
        return source_attempt
    return destination_attempt


def is_attempt_newer(candidate: Any, comparison: Any) -> bool:
    return get_attempt_time(candidate) > get_attempt_time(comparison)


def get_attempt_time(attempt: Any) -> float:
    if not isinstance(attempt, dict):
        return 0

    submitted_at = attempt.get("submittedAt")
    if not isinstance(submitted_at, str):
        return 0

    try:
        normalized_time = submitted_at.replace("Z", "+00:00")
        return dt.datetime.fromisoformat(normalized_time).timestamp()
    except ValueError:
        return 0


def get_attempt_score(attempt: Any) -> float:
    if not isinstance(attempt, dict):
        return 0

    score = attempt.get("score")
    return score if isinstance(score, (int, float)) else 0


def dedupe_preserving_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def put_progress_item(
    dynamodb: Any,
    *,
    table_name: str,
    user_sub: str,
    progress_json: str,
    updated_at: int,
) -> None:
    dynamodb.put_item(
        TableName=table_name,
        Item={
            "progressJson": {"S": progress_json},
            "updatedAt": {"N": str(updated_at)},
            "userId": {"S": user_sub},
        },
    )


def delete_progress_item(dynamodb: Any, *, table_name: str, user_sub: str) -> None:
    dynamodb.delete_item(TableName=table_name, Key={"userId": {"S": user_sub}})


def relink_provider_identity(
    cognito: Any,
    *,
    user_pool_id: str,
    destination_username: str,
    source_username: str,
    provider: str,
    provider_subject: str,
) -> None:
    cognito.admin_delete_user(UserPoolId=user_pool_id, Username=source_username)
    cognito.admin_link_provider_for_user(
        DestinationUser={
            "ProviderAttributeValue": destination_username,
            "ProviderName": "Cognito",
        },
        SourceUser={
            "ProviderAttributeName": "Cognito_Subject",
            "ProviderAttributeValue": provider_subject,
            "ProviderName": provider,
        },
        UserPoolId=user_pool_id,
    )


def write_backup(
    *,
    backup_dir: Path,
    email: str,
    provider: str,
    user_pool_id: str,
    progress_table: str,
    destination_user: CognitoUser,
    source_user: CognitoUser,
    destination_item: dict[str, Any] | None,
    source_item: dict[str, Any] | None,
    merged_progress: dict[str, Any],
    provider_subject: str,
) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")
    path = backup_dir / f"{timestamp}-{sanitize_file_part(email)}-{provider.lower()}.json"
    backup = {
        "createdAt": timestamp,
        "destinationProgressItem": destination_item,
        "destinationUser": summarize_user(destination_user),
        "email": email,
        "mergedProgress": merged_progress,
        "progressTable": progress_table,
        "provider": provider,
        "providerSubject": provider_subject,
        "sourceProgressItem": source_item,
        "sourceUser": summarize_user(source_user),
        "userPoolId": user_pool_id,
    }
    path.write_text(json.dumps(backup, indent=2, sort_keys=True), encoding="utf-8")
    return path


def print_migration_summary(
    *,
    apply: bool,
    backup_path: Path | None,
    destination_progress: dict[str, Any] | None,
    destination_sub: str,
    destination_user: CognitoUser,
    merged_progress: dict[str, Any],
    provider: str,
    provider_subject: str,
    relink_provider: bool,
    source_progress: dict[str, Any] | None,
    source_sub: str,
    source_user: CognitoUser,
    warnings: list[str],
) -> None:
    mode = "APPLY" if apply else "DRY RUN"
    print(f"Mode: {mode}")
    print(f"Destination: {destination_user.username} ({destination_sub})")
    print(f"Source: {source_user.username} ({source_sub})")
    print(f"Provider subject: {provider}:{provider_subject}")
    print(f"Destination progress: {describe_progress(destination_progress)}")
    print(f"Source progress: {describe_progress(source_progress)}")
    print(f"Merged progress: {describe_progress(merged_progress)}")
    print(f"Relink provider: {'yes' if relink_provider else 'no'}")
    if backup_path:
        print(f"Backup: {backup_path}")
    for warning in warnings:
        print(f"Warning: {warning}")


def describe_progress(progress: dict[str, Any] | None) -> str:
    if not progress:
        return "none"
    return (
        f"{len(progress.get('completedLessonIds', []))} completed lessons, "
        f"{len(progress.get('attempts', {}))} attempts, "
        f"{len(progress.get('lessonAnswers', {}))} lesson answer groups, "
        f"{len(progress.get('submittedExerciseAnswers', {}))} submitted answer groups"
    )


def summarize_user(user: CognitoUser) -> dict[str, Any]:
    return {
        "attributes": user.attributes,
        "enabled": user.enabled,
        "status": user.status,
        "username": user.username,
    }


def normalize_email(email: str) -> str:
    normalized = email.strip().lower()
    if not normalized:
        raise MigrationError("Email cannot be empty.")
    return normalized


def is_truthy_string(value: str | None) -> bool:
    return isinstance(value, str) and value.strip().lower() in {"1", "true", "yes"}


def username_has_provider_prefix(username: str, provider: str) -> bool:
    prefix, separator, _provider_subject = username.partition("_")
    return separator == "_" and prefix.lower() == provider.lower()


def looks_like_federated_username(username: str) -> bool:
    prefix, separator, provider_subject = username.partition("_")
    return (
        separator == "_"
        and bool(provider_subject)
        and bool(re.fullmatch(r"[A-Za-z0-9-]+", prefix))
    )


def sanitize_file_part(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "-", value).strip("-")[:96] or "account"


def get_aws_error_code(error: Exception) -> str | None:
    response = getattr(error, "response", None)
    if not isinstance(response, dict):
        return None
    error_detail = response.get("Error")
    if not isinstance(error_detail, dict):
        return None
    code = error_detail.get("Code")
    return code if isinstance(code, str) else None


if __name__ == "__main__":
    raise SystemExit(main())
