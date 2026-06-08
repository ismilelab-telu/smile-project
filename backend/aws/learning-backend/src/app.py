from __future__ import annotations

import ast
import base64
import binascii
import csv
import hashlib
import hmac
import html
import io
import json
import os
from pathlib import Path
import random
import re
import secrets
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile
from typing import Any

try:
    import jwt
    from jwt import InvalidTokenError, PyJWKClient
    from jwt.exceptions import PyJWKClientError
except ImportError:  # pragma: no cover - Lambda and SAM builds install PyJWT.
    jwt = None
    PyJWKClient = None

    class InvalidTokenError(Exception):
        pass

    class PyJWKClientError(Exception):
        pass

try:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import ClientError
except ImportError:  # pragma: no cover - Lambda and SAM builds install boto3.
    boto3 = None
    Config = None

    class ClientError(Exception):
        pass

try:
    import aws_encryption_sdk
    from aws_encryption_sdk import CommitmentPolicy
except ImportError:  # pragma: no cover - Lambda and SAM builds install this dependency.
    aws_encryption_sdk = None
    CommitmentPolicy = None


UPLOAD_BUCKET = os.environ.get("UPLOAD_BUCKET", "")
LEARNING_PROGRESS_TABLE = os.environ.get("LEARNING_PROGRESS_TABLE", "")
USERNAME_RESERVATION_TABLE = os.environ.get("USERNAME_RESERVATION_TABLE", "")
AUTH_COOLDOWN_TABLE = os.environ.get("AUTH_COOLDOWN_TABLE", "")
AWS_REGION = os.environ.get("AWS_REGION", "ap-southeast-1")
COGNITO_REGION = os.environ.get("COGNITO_REGION", AWS_REGION)
COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "")
COGNITO_CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID", "")
COGNITO_CLIENT_SECRET = os.environ.get("COGNITO_CLIENT_SECRET", "")
COGNITO_OAUTH_DOMAIN = os.environ.get("COGNITO_OAUTH_DOMAIN", "").strip().rstrip("/")
COGNITO_OAUTH_REDIRECT_URIS = os.environ.get("COGNITO_OAUTH_REDIRECT_URIS", "")
COGNITO_GOOGLE_IDP_NAME = os.environ.get("COGNITO_GOOGLE_IDP_NAME", "Google")
COGNITO_MICROSOFT_IDP_NAME = os.environ.get("COGNITO_MICROSOFT_IDP_NAME", "Microsoft")
COGNITO_EMAIL_SENDER_KMS_KEY_ARN = os.environ.get("COGNITO_EMAIL_SENDER_KMS_KEY_ARN", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_API_KEY_SECRET_ID = os.environ.get("RESEND_API_KEY_SECRET_ID", "")
RESEND_API_URL = os.environ.get("RESEND_API_URL", "https://api.resend.com/emails")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "Smile Lab <auth@smilelab.me>")
RESEND_REPLY_TO_EMAIL = os.environ.get("RESEND_REPLY_TO_EMAIL", "")
RESEND_AUTH_TEMPLATE_ID = os.environ.get("RESEND_AUTH_TEMPLATE_ID", "smile-auth-code")
RESEND_REQUEST_TIMEOUT_SECONDS = 10
AUTH_CONFIRMATION_CODE_PEPPER = os.environ.get("AUTH_CONFIRMATION_CODE_PEPPER", "")
LEARNING_BACKEND_PROXY_SECRET = os.environ.get("LEARNING_BACKEND_PROXY_SECRET", "")
LEARNING_BACKEND_PROXY_SECRET_HEADER = "x-smile-learning-backend-proxy-secret"
LEARNING_BACKEND_REQUIRE_PROXY_SECRET = (
    os.environ.get("LEARNING_BACKEND_REQUIRE_PROXY_SECRET", "").strip().lower() == "true"
)
AUTH_RESEND_COOLDOWN_SECONDS = int(os.environ.get("AUTH_RESEND_COOLDOWN_SECONDS", "30"))
AUTH_CONFIRMATION_CODE_TTL_SECONDS = int(
    os.environ.get("AUTH_CONFIRMATION_CODE_TTL_SECONDS", "300")
)
AUTH_PUBLIC_REQUEST_COOLDOWN_SECONDS = int(
    os.environ.get("AUTH_PUBLIC_REQUEST_COOLDOWN_SECONDS", "3")
)
AUTH_SIGN_IN_COOLDOWN_SECONDS = int(os.environ.get("AUTH_SIGN_IN_COOLDOWN_SECONDS", "2"))
AUTH_SIGN_IN_BURST_LIMIT = int(os.environ.get("AUTH_SIGN_IN_BURST_LIMIT", "8"))
AUTH_SIGN_IN_BURST_WINDOW_SECONDS = int(
    os.environ.get("AUTH_SIGN_IN_BURST_WINDOW_SECONDS", "300")
)
AUTH_SIGN_UP_COOLDOWN_SECONDS = int(os.environ.get("AUTH_SIGN_UP_COOLDOWN_SECONDS", "5"))
AUTH_SIGN_UP_MIN_DURATION_SECONDS = float(
    os.environ.get("AUTH_SIGN_UP_MIN_DURATION_SECONDS", "1.0")
)
AUTH_SIGN_UP_TIMING_JITTER_SECONDS = float(
    os.environ.get("AUTH_SIGN_UP_TIMING_JITTER_SECONDS", "0.4")
)
AUTH_CONFIRMATION_CODE_PEPPER_MIN_LENGTH = 32
AUTH_CONFIRMATION_CODE_DIGITS = 6
AUTH_CONFIRMATION_MAX_ATTEMPTS = 5
AUTH_SESSION_REVOKE_BURST_LIMIT = int(os.environ.get("AUTH_SESSION_REVOKE_BURST_LIMIT", "30"))
AUTH_SESSION_REVOKE_BURST_WINDOW_SECONDS = int(
    os.environ.get("AUTH_SESSION_REVOKE_BURST_WINDOW_SECONDS", "60")
)
AUTH_EMAIL_DEFAULT_LOCALE = "id"
AUTH_REFRESH_SESSION_COOKIE_NAME = os.environ.get(
    "AUTH_REFRESH_SESSION_COOKIE_NAME",
    "__Host-smile-refresh-session",
)
AUTH_GOOGLE_OAUTH_COOKIE_NAME = os.environ.get(
    "AUTH_GOOGLE_OAUTH_COOKIE_NAME",
    "__Host-smile-oauth-google",
)
AUTH_MICROSOFT_OAUTH_COOKIE_NAME = os.environ.get(
    "AUTH_MICROSOFT_OAUTH_COOKIE_NAME",
    "__Host-smile-oauth-microsoft",
)
AUTH_REFRESH_SESSION_COOKIE_MAX_AGE_SECONDS = int(
    os.environ.get("AUTH_REFRESH_SESSION_COOKIE_MAX_AGE_SECONDS", str(7 * 24 * 60 * 60))
)
AUTH_GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS = int(
    os.environ.get("AUTH_GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS", "600")
)
AUTH_OAUTH_COOKIE_MAX_AGE_SECONDS = int(
    os.environ.get(
        "AUTH_OAUTH_COOKIE_MAX_AGE_SECONDS",
        str(AUTH_GOOGLE_OAUTH_COOKIE_MAX_AGE_SECONDS),
    )
)
AUTH_REFRESH_SESSION_COOKIE_SECURE = (
    os.environ.get("AUTH_REFRESH_SESSION_COOKIE_SECURE", "true").strip().lower() != "false"
)
COGNITO_THROTTLE_ERROR_CODES = {"LimitExceededException", "TooManyRequestsException"}
MAX_ZIP_BYTES = int(os.environ.get("MAX_ZIP_BYTES", "52428800"))
MAX_UNZIPPED_BYTES = int(os.environ.get("MAX_UNZIPPED_BYTES", "104857600"))
MAX_PROGRESS_JSON_BYTES = int(os.environ.get("MAX_PROGRESS_JSON_BYTES", "300000"))
MAX_ZIP_ENTRIES = 512
PRESIGN_EXPIRES_IN_SECONDS = 600
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9._-]+$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PASSWORD_MIN_LENGTH = 12
PASSWORD_SYMBOLS = set("^$*.[]{}()?\"!@#%&/\\,><':;|_~`=+-")
USERNAME_RESERVATION_TTL_SECONDS = 24 * 60 * 60
AUTH_COOLDOWN_TTL_SECONDS = 60 * 60
COGNITO_OAUTH_SCOPES = "openid email profile"
COGNITO_OAUTH_REQUEST_TIMEOUT_SECONDS = 10

_s3_client = None
_dynamodb_client = None
_cognito_identity_provider_client = None
_secrets_manager_client = None
_jwks_client = None
_resend_api_key_cache = None


class ClientInputError(ValueError):
    pass


class AuthenticationError(ValueError):
    pass


class AuthConfigurationError(RuntimeError):
    pass


class UsernameReservationError(ValueError):
    pass


class AuthCooldownError(ValueError):
    def __init__(self, retry_after_seconds: int, next_allowed_at: int):
        super().__init__("Please wait before requesting another verification code.")
        self.retry_after_seconds = retry_after_seconds
        self.next_allowed_at = next_allowed_at


class AuthRateLimitError(ValueError):
    def __init__(self, retry_after_seconds: int, next_allowed_at: int):
        super().__init__("Too many auth requests. Please wait before trying again.")
        self.retry_after_seconds = retry_after_seconds
        self.next_allowed_at = next_allowed_at


class AuthCodeExpiredError(ValueError):
    pass


class CognitoSignInError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def lambda_handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    if event.get("triggerSource"):
        return handle_cognito_trigger(event)

    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path = event.get("rawPath", "/")

    if is_learning_backend_proxy_required(path) and not is_trusted_learning_backend_proxy_request(
        event
    ):
        return response(403, {"message": "Learning backend proxy is required."})

    if method == "OPTIONS":
        return response(204, {})

    try:
        if method == "GET" and path == "/health":
            return response(200, {"ok": True})

        if method == "GET" and path == "/progress":
            user = require_authenticated_user(event)
            return response(200, get_learning_progress(user))

        if method == "PUT" and path == "/progress":
            user = require_authenticated_user(event)
            return response(200, save_learning_progress(parse_json_body(event), user))

        if method == "POST" and path == "/auth/sign-up/start":
            body = parse_json_body(event)
            enforce_public_auth_rate_limit(
                event,
                "sign-up-start",
                get_optional_string(body, "email"),
                cooldown_seconds=AUTH_SIGN_UP_COOLDOWN_SECONDS,
            )
            return response(200, start_sign_up(body))

        if method == "POST" and path == "/auth/confirmation/resend":
            body = parse_json_body(event)
            enforce_public_auth_rate_limit(
                event,
                "confirmation-resend",
                get_optional_string(body, "email"),
                cooldown_seconds=AUTH_RESEND_COOLDOWN_SECONDS,
            )
            return response(200, resend_confirmation_code(body))

        if method == "POST" and path == "/auth/confirmation/confirm":
            body = parse_json_body(event)
            enforce_public_auth_rate_limit(
                event,
                "confirmation-confirm",
                get_optional_string(body, "email"),
            )
            return response(200, confirm_sign_up(body))

        if method == "POST" and path == "/auth/email/sign-in":
            body = parse_json_body(event)
            enforce_public_auth_rate_limit(
                event,
                "email-sign-in",
                get_optional_string(body, "email"),
                cooldown_seconds=AUTH_SIGN_IN_COOLDOWN_SECONDS,
            )
            enforce_public_auth_burst_limit(
                event,
                "email-sign-in",
                get_optional_string(body, "email"),
                max_requests=AUTH_SIGN_IN_BURST_LIMIT,
                window_seconds=AUTH_SIGN_IN_BURST_WINDOW_SECONDS,
            )
            return auth_session_response(sign_in_with_email(body))

        if method == "POST" and path == "/auth/username/sign-in":
            body = parse_json_body(event)
            enforce_public_auth_rate_limit(
                event,
                "username-sign-in",
                get_optional_string(body, "username"),
                cooldown_seconds=AUTH_SIGN_IN_COOLDOWN_SECONDS,
            )
            enforce_public_auth_burst_limit(
                event,
                "username-sign-in",
                get_optional_string(body, "username"),
                max_requests=AUTH_SIGN_IN_BURST_LIMIT,
                window_seconds=AUTH_SIGN_IN_BURST_WINDOW_SECONDS,
            )
            return auth_session_response(sign_in_with_username(body))

        if method == "POST" and path == "/auth/oauth/google/start":
            body = parse_json_body(event)
            enforce_public_auth_rate_limit(
                event,
                "google-oauth-start",
                None,
                cooldown_seconds=AUTH_SIGN_IN_COOLDOWN_SECONDS,
            )
            oauth_start = start_google_oauth_sign_in(body)
            return response(200, oauth_start["body"], cookies=[oauth_start["cookie"]])

        if method == "POST" and path == "/auth/oauth/microsoft/start":
            body = parse_json_body(event)
            enforce_public_auth_rate_limit(
                event,
                "microsoft-oauth-start",
                None,
                cooldown_seconds=AUTH_SIGN_IN_COOLDOWN_SECONDS,
            )
            oauth_start = start_microsoft_oauth_sign_in(body)
            return response(200, oauth_start["body"], cookies=[oauth_start["cookie"]])

        if method == "POST" and path == "/auth/oauth/google/callback":
            body = parse_json_body(event)
            enforce_public_auth_rate_limit(
                event,
                "google-oauth-callback",
                None,
                cooldown_seconds=AUTH_SIGN_IN_COOLDOWN_SECONDS,
            )
            return auth_session_response(
                complete_google_oauth_sign_in(body, event),
                cookies=[create_clear_google_oauth_cookie()],
            )

        if method == "POST" and path == "/auth/oauth/microsoft/callback":
            body = parse_json_body(event)
            enforce_public_auth_rate_limit(
                event,
                "microsoft-oauth-callback",
                None,
                cooldown_seconds=AUTH_SIGN_IN_COOLDOWN_SECONDS,
            )
            return auth_session_response(
                complete_microsoft_oauth_sign_in(body, event),
                cookies=[create_clear_microsoft_oauth_cookie()],
            )

        if method == "POST" and path == "/auth/username/resolve":
            parse_json_body(event)
            return response(400, get_generic_sign_in_error_body())

        if method == "POST" and path == "/auth/session/refresh":
            body = parse_json_body(event)
            enforce_public_auth_rate_limit(
                event,
                "session-refresh",
                None,
                cooldown_seconds=AUTH_SIGN_IN_COOLDOWN_SECONDS,
            )
            refresh_session = get_refresh_session_from_request(body, event)
            enforce_public_auth_identifier_rate_limit(
                "session-refresh",
                refresh_session.get("userSub"),
                cooldown_seconds=AUTH_SIGN_IN_COOLDOWN_SECONDS,
            )
            return auth_session_response(refresh_cognito_session(body, event))

        if method == "POST" and path == "/auth/session/bootstrap":
            body = parse_json_body(event)
            enforce_public_auth_rate_limit(
                event,
                "session-bootstrap",
                None,
                cooldown_seconds=AUTH_SIGN_IN_COOLDOWN_SECONDS,
            )
            refresh_session = get_refresh_session_from_request(body, event)
            enforce_public_auth_identifier_rate_limit(
                "session-bootstrap",
                refresh_session.get("userSub"),
                cooldown_seconds=AUTH_SIGN_IN_COOLDOWN_SECONDS,
            )
            return auth_session_response(refresh_cognito_session(body, event))

        if method == "POST" and path == "/auth/session/revoke":
            body = parse_json_body(event)
            enforce_public_auth_burst_limit(
                event,
                "session-revoke",
                max_requests=AUTH_SESSION_REVOKE_BURST_LIMIT,
                window_seconds=AUTH_SESSION_REVOKE_BURST_WINDOW_SECONDS,
            )
            return response(
                200,
                revoke_cognito_session(body, event),
                cookies=[create_clear_refresh_session_cookie()],
            )

        if method == "POST" and path == "/auth/password-reset/request":
            body = parse_json_body(event)
            enforce_public_auth_rate_limit(
                event,
                "password-reset-request",
                get_optional_string(body, "email"),
                cooldown_seconds=AUTH_RESEND_COOLDOWN_SECONDS,
            )
            return response(200, request_password_reset(body))

        if method == "POST" and path == "/auth/password-reset/confirm":
            body = parse_json_body(event)
            enforce_public_auth_rate_limit(
                event,
                "password-reset-confirm",
                get_optional_string(body, "email"),
            )
            return response(200, confirm_password_reset(body))

        if method == "POST" and path == "/uploads/presign":
            body = parse_json_body(event)
            user = require_learning_backend_user(event, body)
            return response(200, create_presigned_upload(body, user))

        if method == "POST" and path == "/datasets/inspect":
            body = parse_json_body(event)
            user = require_learning_backend_user(event, body)
            return response(200, inspect_uploaded_dataset(body, user))

        if method == "POST" and path == "/pandas/validate":
            body = parse_json_body(event)
            user = require_learning_backend_user(event, body)
            return response(200, validate_uploaded_dataset_code(body, user))

        return response(404, {"message": "Route not found."})
    except AuthenticationError as error:
        return response(401, {"message": str(error)})
    except AuthConfigurationError:
        return response(500, {"message": "Auth is not configured for this backend."})
    except AuthCooldownError as error:
        return response(
            429,
            {
                "code": "ResendConfirmationCooldownException",
                "message": str(error),
                "nextAllowedAt": error.next_allowed_at,
                "retryAfterSeconds": error.retry_after_seconds,
            },
        )
    except AuthRateLimitError as error:
        return response(
            429,
            {
                "code": "AuthRateLimitExceededException",
                "message": str(error),
                "nextAllowedAt": error.next_allowed_at,
                "retryAfterSeconds": error.retry_after_seconds,
            },
        )
    except AuthCodeExpiredError as error:
        return response(400, {"code": "ExpiredCodeException", "message": str(error)})
    except UsernameReservationError as error:
        return response(400, {"code": "InvalidUsernameException", "message": str(error)})
    except CognitoSignInError as error:
        return response(400, {"code": error.code, "message": str(error)})
    except ClientInputError as error:
        return response(400, {"message": str(error)})
    except ClientError:
        return response(502, {"message": "Backend AWS operation failed."})
    except zipfile.BadZipFile:
        return response(400, {"message": "The uploaded file is not a readable ZIP archive."})


def handle_cognito_trigger(event: dict[str, Any]) -> dict[str, Any]:
    trigger_source = event.get("triggerSource")

    if isinstance(trigger_source, str) and trigger_source.startswith("CustomEmailSender_"):
        send_cognito_email_with_resend(event)
    elif trigger_source == "PreSignUp_SignUp":
        reserve_username_for_signup(event)
    elif trigger_source == "PreSignUp_ExternalProvider":
        link_verified_federated_user_to_existing_profile(event)
    elif trigger_source == "PostConfirmation_ConfirmSignUp":
        confirm_username_reservation(event)

    return event


def reserve_username_for_signup(event: dict[str, Any]) -> None:
    reserve_username_reservation(
        get_cognito_user_attribute(event, "email").lower(),
        get_cognito_user_attribute(event, "name"),
        int(time.time()),
    )


def link_verified_federated_user_to_existing_profile(event: dict[str, Any]) -> None:
    email = normalize_optional_auth_email(get_cognito_user_attribute(event, "email"))
    if not email or not is_cognito_user_attribute_truthy(event, "email_verified"):
        return

    user_pool_id = get_cognito_trigger_user_pool_id(event)
    if not user_pool_id:
        return

    source_user = get_federated_link_source_user(event)
    if not source_user:
        return

    destination_user = get_existing_verified_cognito_user_by_email(email, user_pool_id)
    if not destination_user:
        return

    get_cognito_identity_provider_client().admin_link_provider_for_user(
        DestinationUser={
            "ProviderAttributeValue": destination_user,
            "ProviderName": "Cognito",
        },
        SourceUser=source_user,
        UserPoolId=user_pool_id,
    )


def get_cognito_trigger_user_pool_id(event: dict[str, Any]) -> str:
    user_pool_id = event.get("userPoolId")

    if isinstance(user_pool_id, str) and user_pool_id.strip():
        return user_pool_id.strip()

    return COGNITO_USER_POOL_ID


def get_federated_link_source_user(event: dict[str, Any]) -> dict[str, str] | None:
    user_name = str(event.get("userName") or "").strip()
    provider_name, separator, provider_subject = user_name.partition("_")
    if not provider_name or not separator or not provider_subject:
        return None

    configured_provider_name = get_configured_oauth_provider_name(provider_name)
    if not configured_provider_name:
        return None

    return {
        "ProviderAttributeName": "Cognito_Subject",
        "ProviderAttributeValue": provider_subject,
        "ProviderName": configured_provider_name,
    }


def get_configured_oauth_provider_name(provider_name: str) -> str:
    normalized_provider_name = provider_name.strip().lower()
    for configured_provider_name in {
        COGNITO_GOOGLE_IDP_NAME,
        COGNITO_MICROSOFT_IDP_NAME,
    }:
        if configured_provider_name and configured_provider_name.lower() == normalized_provider_name:
            return configured_provider_name

    return ""


def get_existing_verified_cognito_user_by_email(email: str, user_pool_id: str) -> str:
    try:
        user = get_cognito_identity_provider_client().admin_get_user(
            UserPoolId=user_pool_id,
            Username=email,
        )
    except ClientError as error:
        if get_client_error_code(error) == "UserNotFoundException":
            return ""

        raise

    if normalize_optional_auth_email(get_admin_user_attribute(user, "email")) != email:
        return ""

    if not is_admin_user_attribute_truthy(user, "email_verified"):
        return ""

    username = user.get("Username")
    return username if isinstance(username, str) and username else email


def get_admin_user_attribute(user: dict[str, Any], name: str) -> str:
    attributes = user.get("UserAttributes", [])
    if not isinstance(attributes, list):
        return ""

    for attribute in attributes:
        if not isinstance(attribute, dict):
            continue

        if attribute.get("Name") == name and isinstance(attribute.get("Value"), str):
            return str(attribute["Value"]).strip()

    return ""


def is_cognito_user_attribute_truthy(event: dict[str, Any], name: str) -> bool:
    return is_truthy_auth_attribute(get_cognito_user_attribute(event, name))


def is_admin_user_attribute_truthy(user: dict[str, Any], name: str) -> bool:
    return is_truthy_auth_attribute(get_admin_user_attribute(user, name))


def is_truthy_auth_attribute(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes"}


def reserve_username_reservation(email: str, username: str, now: int) -> str:
    username_key = normalize_signup_username(username)

    if not email:
        raise UsernameReservationError("Email is required.")

    try:
        get_dynamodb_client().put_item(
            TableName=require_username_reservation_table(),
            Item={
                "createdAt": {"N": str(now)},
                "email": {"S": email},
                "expiresAt": {"N": str(now + USERNAME_RESERVATION_TTL_SECONDS)},
                "status": {"S": "pending"},
                "username": {"S": username.strip()},
                "usernameKey": {"S": username_key},
            },
            ConditionExpression=(
                "attribute_not_exists(usernameKey) OR email = :email OR expiresAt < :now"
            ),
            ExpressionAttributeValues={
                ":email": {"S": email},
                ":now": {"N": str(now)},
            },
        )
    except ClientError as error:
        if is_conditional_check_failed(error):
            raise UsernameReservationError("Username is already taken.") from error

        raise

    return username_key


def confirm_username_reservation(event: dict[str, Any]) -> None:
    email = get_cognito_user_attribute(event, "email").lower()
    username = get_cognito_user_attribute(event, "name")

    try:
        username_key = normalize_signup_username(username)
    except UsernameReservationError:
        return

    item = get_dynamodb_client().get_item(
        TableName=require_username_reservation_table(),
        Key={"usernameKey": {"S": username_key}},
        ConsistentRead=True,
    ).get("Item")
    if not item or item.get("email", {}).get("S") != email:
        return

    confirm_username_reservation_for_values(email, username, int(time.time()))


def confirm_username_reservation_for_values(email: str, username: str, now: int) -> None:
    username_key = normalize_signup_username(username)

    if not email:
        return

    try:
        get_dynamodb_client().update_item(
            TableName=require_username_reservation_table(),
            Key={"usernameKey": {"S": username_key}},
            UpdateExpression="SET #status = :status, confirmedAt = :confirmedAt REMOVE expiresAt",
            ConditionExpression="email = :email",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":confirmedAt": {"N": str(now)},
                ":email": {"S": email},
                ":status": {"S": "confirmed"},
            },
        )
    except ClientError as error:
        if not is_conditional_check_failed(error):
            raise


def send_cognito_email_with_resend(event: dict[str, Any]) -> None:
    recipient = get_cognito_user_attribute(event, "email")
    encrypted_code = get_cognito_request_value(event, "code")

    if not recipient:
        raise AuthConfigurationError("Cognito custom email event is missing an email.")

    code = decrypt_cognito_sender_code(encrypted_code) if encrypted_code else ""
    message = build_cognito_email_message(
        event.get("triggerSource", ""),
        code,
        locale=get_cognito_email_locale(event),
    )
    record_confirmation_code_expiry(event)

    send_resend_email(
        recipient=recipient,
        subject=message["subject"],
        template_id=message["template_id"],
        template_variables=message["variables"],
    )


def build_cognito_email_message(
    trigger_source: Any,
    code: str,
    *,
    locale: str = AUTH_EMAIL_DEFAULT_LOCALE,
) -> dict[str, Any]:
    trigger = trigger_source if isinstance(trigger_source, str) else ""
    copy = get_auth_email_copy(trigger, locale)
    title = copy["title"]

    return {
        "subject": copy["subject"],
        "template_id": require_resend_auth_template_id(),
        "variables": {
            "TITLE": title,
            "PREVIEW_TEXT": copy["intro"],
            "HEADLINE": copy["headline"].upper(),
            "INTRO": copy["intro"],
            "CODE_LABEL": copy["label"],
            "CODE": html.escape(code or copy["empty_code"]),
            "SECURITY_NOTE": copy["security_note"],
            "FOOTER_COPY": copy["footer_copy"],
            "IGNORE_NOTE": copy["ignore_note"],
        },
    }


def get_auth_email_copy(trigger: str, locale: str) -> dict[str, str]:
    normalized_locale = normalize_auth_email_locale(locale)
    if normalized_locale == "en":
        return get_auth_email_copy_en(trigger)

    return get_auth_email_copy_id(trigger)


def get_auth_email_copy_id(trigger: str) -> dict[str, str]:
    copy = {
        "empty_code": "Buka aplikasi Smile Lab untuk melanjutkan.",
        "footer_copy": (
            "Smile Lab membantu kamu belajar machine learning dengan progres yang rapi, "
            "latihan bertahap, dan feedback yang jelas."
        ),
        "headline": "Hampir selesai",
        "ignore_note": (
            "Email ini dikirim untuk keamanan akun. Abaikan email ini jika kamu tidak meminta "
            "kode dari Smile Lab."
        ),
        "intro": "Masukkan kode ini untuk menyelesaikan verifikasi akun Smile Lab.",
        "label": "Kode verifikasi",
        "security_note": "Kode ini hanya untuk akun Smile Lab kamu. Jangan bagikan kepada siapa pun.",
        "subject": "Kode verifikasi Smile Lab",
        "title": "Verifikasi akun",
    }

    if trigger == "CustomEmailSender_ForgotPassword":
        copy |= {
            "headline": "Reset password",
            "intro": "Masukkan kode ini untuk mengatur ulang password akun Smile Lab.",
            "label": "Kode reset password",
            "subject": "Kode reset password Smile Lab",
            "title": "Reset password",
        }
    elif trigger in {
        "CustomEmailSender_UpdateUserAttribute",
        "CustomEmailSender_VerifyUserAttribute",
    }:
        copy |= {
            "headline": "Verifikasi email",
            "intro": "Masukkan kode ini untuk memverifikasi email akun Smile Lab.",
            "subject": "Kode verifikasi email Smile Lab",
            "title": "Verifikasi email",
        }
    elif trigger == "CustomEmailSender_Authentication":
        copy |= {
            "headline": "Kode masuk",
            "intro": "Masukkan kode ini untuk melanjutkan proses masuk ke Smile Lab.",
            "label": "Kode masuk",
            "subject": "Kode masuk Smile Lab",
            "title": "Kode masuk",
        }
    elif trigger == "CustomEmailSender_AdminCreateUser":
        copy |= {
            "headline": "Akun siap",
            "intro": "Gunakan nilai berikut untuk menyelesaikan akses akun Smile Lab.",
            "label": "Kode atau password sementara",
            "subject": "Undangan akun Smile Lab",
            "title": "Akun Smile Lab dibuat",
        }

    return copy


def get_auth_email_copy_en(trigger: str) -> dict[str, str]:
    copy = {
        "empty_code": "Open Smile Lab to continue.",
        "footer_copy": (
            "Smile Lab helps you learn machine learning with organized progress, guided practice, "
            "and clear feedback."
        ),
        "headline": "Almost there",
        "ignore_note": (
            "This email was sent for account security. Ignore it if you did not request a code "
            "from Smile Lab."
        ),
        "intro": "Enter this code to finish verifying your Smile Lab account.",
        "label": "Verification code",
        "security_note": "This code is only for your Smile Lab account. Do not share it with anyone.",
        "subject": "Smile Lab verification code",
        "title": "Verify your account",
    }

    if trigger == "CustomEmailSender_ForgotPassword":
        copy |= {
            "headline": "Reset password",
            "intro": "Enter this code to reset your Smile Lab account password.",
            "label": "Password reset code",
            "subject": "Smile Lab password reset code",
            "title": "Reset password",
        }
    elif trigger in {
        "CustomEmailSender_UpdateUserAttribute",
        "CustomEmailSender_VerifyUserAttribute",
    }:
        copy |= {
            "headline": "Verify email",
            "intro": "Enter this code to verify your Smile Lab account email.",
            "subject": "Smile Lab email verification code",
            "title": "Verify email",
        }
    elif trigger == "CustomEmailSender_Authentication":
        copy |= {
            "headline": "Sign-in code",
            "intro": "Enter this code to continue signing in to Smile Lab.",
            "label": "Sign-in code",
            "subject": "Smile Lab sign-in code",
            "title": "Sign-in code",
        }
    elif trigger == "CustomEmailSender_AdminCreateUser":
        copy |= {
            "headline": "Account ready",
            "intro": "Use this value to finish accessing your Smile Lab account.",
            "label": "Code or temporary password",
            "subject": "Your Smile Lab account is ready",
            "title": "Smile Lab account created",
        }

    return copy


def decrypt_cognito_sender_code(encrypted_code: str) -> str:
    if aws_encryption_sdk is None or CommitmentPolicy is None:
        raise AuthConfigurationError("AWS Encryption SDK is required for Cognito custom emails.")

    if not COGNITO_EMAIL_SENDER_KMS_KEY_ARN:
        raise AuthConfigurationError("Cognito custom email KMS key is not configured.")

    try:
        ciphertext = base64.b64decode(encrypted_code)
    except (binascii.Error, ValueError) as error:
        raise AuthConfigurationError("Cognito custom email code is not valid base64.") from error

    try:
        client = aws_encryption_sdk.EncryptionSDKClient(
            commitment_policy=CommitmentPolicy.FORBID_ENCRYPT_ALLOW_DECRYPT
        )
        key_provider = aws_encryption_sdk.StrictAwsKmsMasterKeyProvider(
            key_ids=[COGNITO_EMAIL_SENDER_KMS_KEY_ARN]
        )
        plaintext, _header = client.decrypt(source=ciphertext, key_provider=key_provider)
    except Exception as error:  # pragma: no cover - exercised only against AWS KMS.
        raise AuthConfigurationError("Unable to decrypt Cognito custom email code.") from error

    return plaintext.decode("utf-8")


def send_resend_email(
    *,
    recipient: str,
    subject: str,
    html_body: str | None = None,
    template_id: str | None = None,
    template_variables: dict[str, Any] | None = None,
    text_body: str | None = None,
) -> None:
    payload: dict[str, Any] = {
        "from": RESEND_FROM_EMAIL,
        "subject": subject,
        "to": [recipient],
    }

    if template_id:
        payload["template"] = {
            "id": template_id,
            "variables": template_variables or {},
        }
    elif html_body or text_body:
        if html_body:
            payload["html"] = html_body
        if text_body:
            payload["text"] = text_body
    else:
        raise AuthConfigurationError("Resend email content is not configured.")

    if RESEND_REPLY_TO_EMAIL:
        payload["reply_to"] = RESEND_REPLY_TO_EMAIL

    request = urllib.request.Request(
        RESEND_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {get_resend_api_key()}",
            "Content-Type": "application/json",
            "User-Agent": "SmileLab/1.0 (+https://smile-project.pages.dev)",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=RESEND_REQUEST_TIMEOUT_SECONDS) as result:
            result.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace").strip()
        message = f"Resend email request failed with status {error.code}."
        if detail:
            message = f"{message} {detail[:500]}"
        raise RuntimeError(message) from error
    except urllib.error.URLError as error:
        raise RuntimeError("Resend email request failed.") from error


def require_resend_auth_template_id() -> str:
    template_id = RESEND_AUTH_TEMPLATE_ID.strip()
    if not template_id:
        raise AuthConfigurationError("Resend auth template ID is not configured.")

    return template_id


def get_resend_api_key() -> str:
    global _resend_api_key_cache

    if RESEND_API_KEY:
        return RESEND_API_KEY

    if _resend_api_key_cache:
        return _resend_api_key_cache

    if not RESEND_API_KEY_SECRET_ID:
        raise AuthConfigurationError("Resend API key secret is not configured.")

    secret = get_secrets_manager_client().get_secret_value(SecretId=RESEND_API_KEY_SECRET_ID)
    secret_value = secret.get("SecretString", "")

    if not secret_value and secret.get("SecretBinary"):
        secret_value = base64.b64decode(secret["SecretBinary"]).decode("utf-8")

    api_key = extract_resend_api_key_from_secret(secret_value)
    if not api_key:
        raise AuthConfigurationError("Resend API key secret is empty.")

    _resend_api_key_cache = api_key
    return api_key


def extract_resend_api_key_from_secret(secret_value: str) -> str:
    value = secret_value.strip()
    if not value:
        return ""

    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        match = re.search(r"re_[A-Za-z0-9_-]+", value)
        return match.group(0) if match else value

    if not isinstance(parsed, dict):
        return ""

    for key in ("apiKey", "resendApiKey", "RESEND_API_KEY", "api_key"):
        api_key = parsed.get(key)
        if isinstance(api_key, str) and api_key.strip():
            return api_key.strip()

    return ""


def get_cognito_request_value(event: dict[str, Any], name: str) -> str:
    request = event.get("request", {})
    value = request.get(name, "") if isinstance(request, dict) else ""

    return value.strip() if isinstance(value, str) else ""


def get_cognito_user_attribute(event: dict[str, Any], name: str) -> str:
    attributes = event.get("request", {}).get("userAttributes", {})
    value = attributes.get(name, "") if isinstance(attributes, dict) else ""

    return value.strip() if isinstance(value, str) else ""


def normalize_signup_username(username: str) -> str:
    trimmed_username = username.strip()

    if len(trimmed_username) < 3:
        raise UsernameReservationError("Username must be at least 3 characters.")

    if not USERNAME_PATTERN.fullmatch(trimmed_username):
        raise UsernameReservationError(
            "Username can only use letters, numbers, dots, underscores, or hyphens."
        )

    if trimmed_username[0] in "._-" or trimmed_username[-1] in "._-":
        raise UsernameReservationError("Username cannot start or end with punctuation.")

    return trimmed_username.lower()


def require_username_reservation_table() -> str:
    if not USERNAME_RESERVATION_TABLE:
        raise AuthConfigurationError("Username reservation table is not configured.")

    return USERNAME_RESERVATION_TABLE


def require_auth_cooldown_table() -> str:
    if not AUTH_COOLDOWN_TABLE:
        raise AuthConfigurationError("Auth cooldown table is not configured.")

    return AUTH_COOLDOWN_TABLE


def require_cognito_user_pool_id() -> str:
    if not COGNITO_USER_POOL_ID:
        raise AuthConfigurationError("Cognito user pool id is missing.")

    return COGNITO_USER_POOL_ID


def require_cognito_client_id() -> str:
    if not COGNITO_CLIENT_ID:
        raise AuthConfigurationError("Cognito app client id is missing.")

    return COGNITO_CLIENT_ID


def require_cognito_client_secret() -> str:
    if not COGNITO_CLIENT_SECRET:
        raise AuthConfigurationError("Cognito app client secret is missing.")

    return COGNITO_CLIENT_SECRET


def is_conditional_check_failed(error: ClientError) -> bool:
    return get_client_error_code(error) == "ConditionalCheckFailedException"


def response(
    status_code: int,
    body: dict[str, Any],
    *,
    cookies: list[str] | None = None,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "statusCode": status_code,
        "headers": {
            "cache-control": "no-store",
            "content-type": "application/json; charset=utf-8",
            "x-content-type-options": "nosniff",
        },
        "body": json.dumps(body),
    }

    if cookies:
        result["cookies"] = cookies

    return result


def auth_session_response(
    body: dict[str, Any],
    *,
    cookies: list[str] | None = None,
) -> dict[str, Any]:
    authentication_result = body.get("authenticationResult", {})
    if not isinstance(authentication_result, dict):
        return response(200, body, cookies=cookies)

    session_cookie = create_refresh_session_cookie(authentication_result)
    sanitized_result = {
        key: value for key, value in authentication_result.items() if key != "RefreshToken"
    }
    sanitized_body = {**body, "authenticationResult": sanitized_result}
    response_cookies = [cookie for cookie in [session_cookie, *(cookies or [])] if cookie]

    return response(200, sanitized_body, cookies=response_cookies or None)


def create_refresh_session_cookie(authentication_result: dict[str, Any]) -> str:
    refresh_token = authentication_result.get("RefreshToken")
    user_sub = get_authentication_result_user_sub(authentication_result)

    if not isinstance(refresh_token, str) or not refresh_token or not user_sub:
        return ""

    cookie_value = create_signed_refresh_session_value(
        {
            "refreshToken": refresh_token,
            "userSub": user_sub,
        }
    )

    return create_cookie_header(
        AUTH_REFRESH_SESSION_COOKIE_NAME,
        cookie_value,
        max_age_seconds=AUTH_REFRESH_SESSION_COOKIE_MAX_AGE_SECONDS,
    )


def create_clear_refresh_session_cookie() -> str:
    return create_cookie_header(AUTH_REFRESH_SESSION_COOKIE_NAME, "", max_age_seconds=0)


def create_clear_google_oauth_cookie() -> str:
    return create_cookie_header(AUTH_GOOGLE_OAUTH_COOKIE_NAME, "", max_age_seconds=0)


def create_clear_microsoft_oauth_cookie() -> str:
    return create_cookie_header(AUTH_MICROSOFT_OAUTH_COOKIE_NAME, "", max_age_seconds=0)


def create_cookie_header(name: str, value: str, *, max_age_seconds: int) -> str:
    attributes = [
        f"{name}={value}",
        f"Max-Age={max(0, max_age_seconds)}",
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
    ]

    if AUTH_REFRESH_SESSION_COOKIE_SECURE:
        attributes.append("Secure")

    return "; ".join(attributes)


def create_signed_refresh_session_value(payload: dict[str, str]) -> str:
    serialized_payload = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    encoded_payload = base64.urlsafe_b64encode(serialized_payload).decode("ascii").rstrip("=")
    signature = hmac.new(
        require_cognito_client_secret().encode("utf-8"),
        encoded_payload.encode("ascii"),
        hashlib.sha256,
    ).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=")

    return f"{encoded_payload}.{encoded_signature}"


def create_signed_google_oauth_state_value(payload: dict[str, str | int]) -> str:
    serialized_payload = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    encoded_payload = base64.urlsafe_b64encode(serialized_payload).decode("ascii").rstrip("=")
    signature = hmac.new(
        require_cognito_client_secret().encode("utf-8"),
        encoded_payload.encode("ascii"),
        hashlib.sha256,
    ).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=")

    return f"{encoded_payload}.{encoded_signature}"


def parse_signed_refresh_session_value(cookie_value: str) -> dict[str, str]:
    encoded_payload, separator, encoded_signature = cookie_value.partition(".")
    if not encoded_payload or not separator or not encoded_signature:
        return {}

    expected_value = create_signed_refresh_session_value(
        decode_refresh_session_payload(encoded_payload)
    )
    _, _, expected_signature = expected_value.partition(".")
    if not hmac.compare_digest(encoded_signature, expected_signature):
        return {}

    payload = decode_refresh_session_payload(encoded_payload)
    refresh_token = payload.get("refreshToken")
    user_sub = payload.get("userSub")
    if not isinstance(refresh_token, str) or not isinstance(user_sub, str):
        return {}

    if not refresh_token or not user_sub:
        return {}

    return {
        "refreshToken": refresh_token,
        "userSub": user_sub,
    }


def decode_refresh_session_payload(encoded_payload: str) -> dict[str, Any]:
    try:
        padded_payload = encoded_payload + "=" * (-len(encoded_payload) % 4)
        raw_payload = base64.urlsafe_b64decode(padded_payload.encode("ascii"))
        payload = json.loads(raw_payload.decode("utf-8"))
    except (binascii.Error, json.JSONDecodeError, UnicodeDecodeError):
        return {}

    return payload if isinstance(payload, dict) else {}


def parse_signed_google_oauth_state_value(cookie_value: str, now: int | None = None) -> dict[str, Any]:
    encoded_payload, separator, encoded_signature = cookie_value.partition(".")
    if not encoded_payload or not separator or not encoded_signature:
        return {}

    payload = decode_refresh_session_payload(encoded_payload)
    expected_value = create_signed_google_oauth_state_value(payload)
    _, _, expected_signature = expected_value.partition(".")
    if not hmac.compare_digest(encoded_signature, expected_signature):
        return {}

    expires_at = payload.get("expiresAt")
    request_time = int(time.time()) if now is None else now
    if not isinstance(expires_at, int) or expires_at <= request_time:
        return {}

    return payload


def get_refresh_session_from_request(
    _body: dict[str, Any],
    event: dict[str, Any] | None = None,
) -> dict[str, str]:
    if event is None:
        raise AuthenticationError("Sign in before refreshing this session.")

    cookie_value = get_request_cookie(event, AUTH_REFRESH_SESSION_COOKIE_NAME)
    refresh_session = parse_signed_refresh_session_value(cookie_value) if cookie_value else {}
    if refresh_session:
        return refresh_session

    raise AuthenticationError("Sign in before refreshing this session.")


def get_request_cookie(event: dict[str, Any], name: str) -> str:
    raw_cookie_values = []
    cookies = event.get("cookies")
    if isinstance(cookies, list):
        raw_cookie_values.extend(str(cookie) for cookie in cookies)

    header_cookie = get_header(event, "cookie")
    if header_cookie:
        raw_cookie_values.append(header_cookie)

    for raw_cookie_value in raw_cookie_values:
        for part in raw_cookie_value.split(";"):
            cookie_name, separator, cookie_value = part.strip().partition("=")
            if separator and cookie_name == name:
                return cookie_value

    return ""


def get_oauth_provider_config(provider: str) -> dict[str, str]:
    normalized_provider = provider.strip().lower()
    if normalized_provider == "google":
        return {
            "cookie_name": AUTH_GOOGLE_OAUTH_COOKIE_NAME,
            "expired_message": "Google sign-in session expired. Try again.",
            "failed_code": "GoogleOAuthFailedException",
            "failed_message": "Google sign-in could not be completed. Try again.",
            "idp_name": COGNITO_GOOGLE_IDP_NAME,
            "provider": "google",
        }

    if normalized_provider == "microsoft":
        return {
            "cookie_name": AUTH_MICROSOFT_OAUTH_COOKIE_NAME,
            "expired_message": "Microsoft sign-in session expired. Try again.",
            "failed_code": "MicrosoftOAuthFailedException",
            "failed_message": "Microsoft sign-in could not be completed. Try again.",
            "idp_name": COGNITO_MICROSOFT_IDP_NAME,
            "provider": "microsoft",
        }

    raise AuthConfigurationError("OAuth provider is not configured.")


def get_oauth_state_from_request(
    provider: str,
    event: dict[str, Any] | None,
    now: int | None = None,
) -> dict[str, Any]:
    provider_config = get_oauth_provider_config(provider)
    if event is None:
        raise CognitoSignInError(
            "InvalidOAuthStateException",
            provider_config["expired_message"],
        )

    cookie_value = get_request_cookie(event, provider_config["cookie_name"])
    oauth_state = parse_signed_google_oauth_state_value(cookie_value, now=now) if cookie_value else {}
    if oauth_state:
        return oauth_state

    raise CognitoSignInError(
        "InvalidOAuthStateException",
        provider_config["expired_message"],
    )


def get_google_oauth_state_from_request(
    event: dict[str, Any] | None,
    now: int | None = None,
) -> dict[str, Any]:
    return get_oauth_state_from_request("google", event, now=now)


def get_authentication_result_user_sub(authentication_result: dict[str, Any]) -> str:
    id_token = authentication_result.get("IdToken")
    if not isinstance(id_token, str):
        return ""

    payload = decode_unverified_jwt_payload(id_token)
    user_sub = payload.get("sub") or payload.get("username")

    return user_sub if isinstance(user_sub, str) else ""


def decode_unverified_jwt_payload(token: str) -> dict[str, Any]:
    payload = token.split(".")[1] if "." in token else ""
    if not payload:
        return {}

    try:
        padded_payload = payload + "=" * (-len(payload) % 4)
        raw_payload = base64.urlsafe_b64decode(padded_payload.encode("ascii"))
        decoded_payload = json.loads(raw_payload.decode("utf-8"))
    except (binascii.Error, json.JSONDecodeError, UnicodeDecodeError):
        return {}

    return decoded_payload if isinstance(decoded_payload, dict) else {}


def require_authenticated_user(event: dict[str, Any]) -> dict[str, Any]:
    authorization = get_header(event, "authorization")

    if not authorization:
        raise AuthenticationError("Sign in before using this lesson backend.")

    prefix = "bearer "
    if not authorization.lower().startswith(prefix):
        raise AuthenticationError("Authorization header must use a bearer token.")

    token = authorization[len(prefix) :].strip()
    if not token:
        raise AuthenticationError("Bearer token is empty.")

    return verify_cognito_token(token)


def require_learning_backend_user(event: dict[str, Any], _body: dict[str, Any]) -> dict[str, Any]:
    return require_authenticated_user(event)


def verify_cognito_token(token: str) -> dict[str, Any]:
    if jwt is None or PyJWKClient is None:
        raise AuthConfigurationError("PyJWT is required for auth.")

    if not COGNITO_USER_POOL_ID or not COGNITO_CLIENT_ID:
        raise AuthConfigurationError("Cognito environment variables are missing.")

    issuer = get_cognito_issuer()

    try:
        signing_key = get_jwks_client().get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=issuer,
            options={"verify_aud": False},
        )
    except (InvalidTokenError, PyJWKClientError) as error:
        raise AuthenticationError("Auth token is invalid or expired.") from error

    if claims.get("token_use") != "access":
        raise AuthenticationError("Auth token type is not supported.")

    if claims.get("client_id") != COGNITO_CLIENT_ID:
        raise AuthenticationError("Auth token is not for this app.")

    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject:
        raise AuthenticationError("Auth token is missing a user id.")

    return {
        "email": claims.get("email", ""),
        "sub": subject,
    }


def get_header(event: dict[str, Any], name: str) -> str:
    headers = event.get("headers") or {}
    for key, value in headers.items():
        if key.lower() == name.lower() and isinstance(value, str):
            return value
    return ""


def get_request_source(event: dict[str, Any]) -> str:
    if is_trusted_learning_backend_proxy_request(event):
        source = get_header(event, "cf-connecting-ip").strip()
        if source:
            return source

    source_ip = event.get("requestContext", {}).get("http", {}).get("sourceIp", "")
    if isinstance(source_ip, str) and source_ip.strip():
        return source_ip.strip()

    return "unknown"


def is_trusted_learning_backend_proxy_request(event: dict[str, Any]) -> bool:
    configured_secret = LEARNING_BACKEND_PROXY_SECRET.strip()
    provided_secret = get_header(event, LEARNING_BACKEND_PROXY_SECRET_HEADER)

    return bool(
        configured_secret
        and provided_secret
        and secrets.compare_digest(provided_secret, configured_secret)
    )


def is_learning_backend_proxy_required(path: str) -> bool:
    return LEARNING_BACKEND_REQUIRE_PROXY_SECRET and path != "/health"


def get_cognito_issuer() -> str:
    return f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"


def get_jwks_client():
    global _jwks_client

    if PyJWKClient is None:
        raise AuthConfigurationError("PyJWT is required for auth.")

    if _jwks_client is None:
        _jwks_client = PyJWKClient(f"{get_cognito_issuer()}/.well-known/jwks.json")

    return _jwks_client


def parse_json_body(event: dict[str, Any]) -> dict[str, Any]:
    raw_body = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raw_body = base64.b64decode(raw_body).decode("utf-8")

    if len(raw_body.encode("utf-8")) > MAX_PROGRESS_JSON_BYTES:
        raise ClientInputError("Request body is too large.")

    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError as error:
        raise ClientInputError("Request body must be valid JSON.") from error

    if not isinstance(body, dict):
        raise ClientInputError("Request body must be a JSON object.")

    return body


def get_learning_progress(user: dict[str, Any]) -> dict[str, Any]:
    item = get_dynamodb_client().get_item(
        TableName=require_learning_progress_table(),
        Key={"userId": {"S": user["sub"]}},
        ConsistentRead=True,
    ).get("Item")

    if not item:
        return {"progress": None, "updatedAt": None}

    raw_progress = item.get("progressJson", {}).get("S", "null")
    try:
        progress = json.loads(raw_progress)
    except json.JSONDecodeError:
        progress = None

    if not is_valid_learning_progress(progress):
        progress = None

    updated_at = item.get("updatedAt", {}).get("N")

    return {
        "progress": progress,
        "updatedAt": int(updated_at) if isinstance(updated_at, str) and updated_at.isdigit() else None,
    }


def save_learning_progress(body: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    progress = body.get("progress")

    if not is_valid_learning_progress(progress):
        raise ClientInputError("Learning progress payload is not valid.")

    progress_json = json.dumps(progress, separators=(",", ":"))
    if len(progress_json.encode("utf-8")) > MAX_PROGRESS_JSON_BYTES:
        raise ClientInputError("Learning progress is too large.")

    updated_at = int(time.time())
    get_dynamodb_client().put_item(
        TableName=require_learning_progress_table(),
        Item={
            "progressJson": {"S": progress_json},
            "updatedAt": {"N": str(updated_at)},
            "userId": {"S": user["sub"]},
        },
    )

    return {"ok": True, "updatedAt": updated_at}


def create_presigned_upload(body: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    file_name = get_required_string(body, "fileName")
    content_type = get_optional_string(body, "contentType") or "application/zip"
    safe_file_name = sanitize_file_name(file_name)
    object_key = f"uploads/{user['sub']}/{uuid.uuid4()}/{safe_file_name}"

    upload_url = get_s3_client().generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": UPLOAD_BUCKET,
            "Key": object_key,
            "ContentType": content_type,
        },
        ExpiresIn=PRESIGN_EXPIRES_IN_SECONDS,
        HttpMethod="PUT",
    )

    return {
        "contentType": content_type,
        "expiresInSeconds": PRESIGN_EXPIRES_IN_SECONDS,
        "objectKey": object_key,
        "uploadUrl": upload_url,
    }


def inspect_uploaded_dataset(body: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    object_key = require_upload_object_key(body, user)
    archive = download_archive(object_key)
    inspection = inspect_zip_bytes(archive)

    return {
        "csvPath": inspection["csvPath"],
        "fileName": inspection["fileName"],
        "columns": inspection["columns"],
        "previewRows": inspection["previewRows"],
        "tabularFilePath": f"data/{inspection['csvPath']}",
        "expectedCode": build_expected_pandas_code(f"data/{inspection['csvPath']}"),
    }


def validate_uploaded_dataset_code(body: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    object_key = require_upload_object_key(body, user)
    csv_path = get_required_string(body, "csvPath")
    submitted_code = get_required_string(body, "code")

    archive = download_archive(object_key)
    extracted_csv = extract_csv_from_zip(archive, expected_csv_path=csv_path)
    expected_path = f"data/{extracted_csv['csvPath']}"
    columns, preview_rows = read_csv_preview(extracted_csv["content"])
    validation = run_pandas_loading_code(submitted_code, expected_path, extracted_csv["content"])

    if validation["status"] == "correct":
        columns = validation["columns"]
        preview_rows = validation["previewRows"]

    return {
        "columns": columns,
        "diagnostics": validation.get("diagnostics", []),
        "expectedCode": build_expected_pandas_code(expected_path),
        "message": validation["message"],
        "previewRows": preview_rows,
        "score": validation["score"],
        "status": validation["status"],
        "tabularFilePath": expected_path,
    }


def start_sign_up(body: dict[str, Any], now: int | None = None) -> dict[str, Any]:
    started_at = time.perf_counter()
    email = normalize_auth_email(get_required_string(body, "email"))
    locale = get_auth_email_locale_from_body(body)
    requested_username = get_required_string(body, "name")
    request_time = int(time.time()) if now is None else now

    require_cognito_user_pool_id()
    existing_item = get_pending_signup_item(email)
    enforce_signup_start_cooldown(existing_item, request_time)

    if cognito_user_exists(email):
        release_pending_username_reservation(existing_item, email)
        next_allowed_at = put_existing_signup_cooldown_item(email, request_time)
        sleep_for_signup_response_timing(started_at)
        return build_sign_up_confirmation_response(email, next_allowed_at)

    reserved_username_key = ""

    if is_active_pending_signup(existing_item, request_time):
        existing_next_allowed_at = get_number_attribute(existing_item or {}, "nextAllowedAt")
        if existing_next_allowed_at and existing_next_allowed_at > request_time:
            raise AuthCooldownError(
                existing_next_allowed_at - request_time,
                existing_next_allowed_at,
            )

        username = get_string_attribute(existing_item or {}, "username")
        username_key = get_string_attribute(existing_item or {}, "usernameKey")
        created_at = get_number_attribute(existing_item or {}, "createdAt") or request_time
        if not username or not username_key:
            raise AuthConfigurationError("Pending sign-up is missing username data.")
    else:
        release_pending_username_reservation(existing_item, email)
        username_key = reserve_username_reservation(email, requested_username, request_time)
        reserved_username_key = username_key
        username = requested_username.strip()
        created_at = request_time

    code = create_confirmation_code()
    code_salt = secrets.token_urlsafe(16)
    expires_at = request_time + AUTH_CONFIRMATION_CODE_TTL_SECONDS
    next_allowed_at = request_time + AUTH_RESEND_COOLDOWN_SECONDS

    try:
        put_pending_signup_item(
            email=email,
            locale=locale,
            username=username,
            username_key=username_key,
            code=code,
            code_salt=code_salt,
            created_at=created_at,
            expires_at=expires_at,
            next_allowed_at=next_allowed_at,
            attempts=0,
            updated_at=request_time,
            condition_now=request_time,
        )
    except AuthCooldownError:
        if reserved_username_key:
            current_pending_item = get_pending_signup_item(email)
            current_username_key = get_string_attribute(current_pending_item or {}, "usernameKey")
            if current_username_key != reserved_username_key:
                delete_pending_username_reservation(reserved_username_key, email)
        raise

    send_pending_signup_confirmation_email(email, code, locale=locale)
    sleep_for_signup_response_timing(started_at)

    return build_sign_up_confirmation_response(email, next_allowed_at)


def build_sign_up_confirmation_response(email: str, next_allowed_at: int) -> dict[str, Any]:
    return build_confirmation_resend_response(next_allowed_at) | {
        "CodeDeliveryDetails": {
            "AttributeName": "email",
            "DeliveryMedium": "EMAIL",
            "Destination": mask_email_destination(email),
        },
        "UserConfirmed": False,
    }


def sleep_for_signup_response_timing(started_at: float) -> None:
    minimum_duration_seconds = max(0.0, AUTH_SIGN_UP_MIN_DURATION_SECONDS)
    jitter_seconds = max(0.0, AUTH_SIGN_UP_TIMING_JITTER_SECONDS)
    target_duration = minimum_duration_seconds + random.uniform(0, jitter_seconds)
    elapsed_seconds = max(0.0, time.perf_counter() - started_at)
    remaining_seconds = target_duration - elapsed_seconds

    if remaining_seconds > 0:
        time.sleep(remaining_seconds)


def enforce_signup_start_cooldown(item: dict[str, Any] | None, now: int) -> None:
    if not item:
        return

    expires_at = get_number_attribute(item, "expiresAt")
    next_allowed_at = get_number_attribute(item, "nextAllowedAt")
    if expires_at and expires_at > now and next_allowed_at and next_allowed_at > now:
        raise AuthCooldownError(next_allowed_at - now, next_allowed_at)


def start_google_oauth_sign_in(
    body: dict[str, Any],
    now: int | None = None,
) -> dict[str, Any]:
    return start_cognito_oauth_sign_in("google", body, now=now)


def start_microsoft_oauth_sign_in(
    body: dict[str, Any],
    now: int | None = None,
) -> dict[str, Any]:
    return start_cognito_oauth_sign_in("microsoft", body, now=now)


def start_cognito_oauth_sign_in(
    provider: str,
    body: dict[str, Any],
    now: int | None = None,
) -> dict[str, Any]:
    provider_config = get_oauth_provider_config(provider)
    request_time = int(time.time()) if now is None else now
    redirect_uri = validate_cognito_oauth_redirect_uri(get_required_string(body, "redirectUri"))
    state = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = create_oauth_code_challenge(code_verifier)
    cookie_max_age_seconds = max(1, AUTH_OAUTH_COOKIE_MAX_AGE_SECONDS)
    expires_at = request_time + cookie_max_age_seconds
    oauth_state_cookie = create_cookie_header(
        provider_config["cookie_name"],
        create_signed_google_oauth_state_value(
            {
                "codeVerifier": code_verifier,
                "expiresAt": expires_at,
                "provider": provider_config["provider"],
                "redirectUri": redirect_uri,
                "state": state,
            }
        ),
        max_age_seconds=cookie_max_age_seconds,
    )
    query = urllib.parse.urlencode(
        {
            "client_id": require_cognito_client_id(),
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "identity_provider": provider_config["idp_name"],
            "prompt": "select_account",
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": COGNITO_OAUTH_SCOPES,
            "state": state,
        }
    )

    return {
        "body": {
            "authorizationUrl": f"{require_cognito_oauth_domain()}/oauth2/authorize?{query}",
            "expiresAt": expires_at,
        },
        "cookie": oauth_state_cookie,
    }


def complete_google_oauth_sign_in(
    body: dict[str, Any],
    event: dict[str, Any] | None = None,
    now: int | None = None,
) -> dict[str, Any]:
    return complete_cognito_oauth_sign_in("google", body, event, now=now)


def complete_microsoft_oauth_sign_in(
    body: dict[str, Any],
    event: dict[str, Any] | None = None,
    now: int | None = None,
) -> dict[str, Any]:
    return complete_cognito_oauth_sign_in("microsoft", body, event, now=now)


def complete_cognito_oauth_sign_in(
    provider: str,
    body: dict[str, Any],
    event: dict[str, Any] | None = None,
    now: int | None = None,
) -> dict[str, Any]:
    provider_config = get_oauth_provider_config(provider)
    code = get_required_string(body, "code")
    state = get_required_string(body, "state")
    redirect_uri = validate_cognito_oauth_redirect_uri(get_required_string(body, "redirectUri"))
    oauth_state = get_oauth_state_from_request(provider_config["provider"], event, now=now)

    if oauth_state.get("provider") != provider_config["provider"]:
        raise CognitoSignInError(
            "InvalidOAuthStateException",
            provider_config["expired_message"],
        )

    expected_state = str(oauth_state.get("state") or "")
    if not expected_state or not hmac.compare_digest(state, expected_state):
        raise CognitoSignInError(
            "InvalidOAuthStateException",
            provider_config["expired_message"],
        )

    if oauth_state.get("redirectUri") != redirect_uri:
        raise CognitoSignInError(
            "InvalidOAuthStateException",
            provider_config["expired_message"],
        )

    code_verifier = str(oauth_state.get("codeVerifier") or "")
    if not code_verifier:
        raise CognitoSignInError(
            "InvalidOAuthStateException",
            provider_config["expired_message"],
        )

    return {
        "authenticationResult": exchange_cognito_oauth_code(
            code,
            redirect_uri,
            code_verifier,
            provider_config,
        )
    }


def create_oauth_code_challenge(code_verifier: str) -> str:
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()

    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def exchange_cognito_oauth_code(
    code: str,
    redirect_uri: str,
    code_verifier: str,
    provider_config: dict[str, str] | None = None,
) -> dict[str, Any]:
    resolved_provider_config = provider_config or get_oauth_provider_config("google")
    encoded_body = urllib.parse.urlencode(
        {
            "code": code,
            "code_verifier": code_verifier,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        }
    ).encode("utf-8")
    client_credentials = f"{require_cognito_client_id()}:{require_cognito_client_secret()}".encode(
        "utf-8"
    )
    request = urllib.request.Request(
        f"{require_cognito_oauth_domain()}/oauth2/token",
        data=encoded_body,
        headers={
            "accept": "application/json",
            "authorization": f"Basic {base64.b64encode(client_credentials).decode('ascii')}",
            "content-type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=COGNITO_OAUTH_REQUEST_TIMEOUT_SECONDS,
        ) as token_response:
            payload = json.loads(token_response.read().decode("utf-8"))
    except (
        TimeoutError,
        urllib.error.HTTPError,
        urllib.error.URLError,
        json.JSONDecodeError,
        UnicodeDecodeError,
    ) as error:
        raise CognitoSignInError(
            resolved_provider_config["failed_code"],
            resolved_provider_config["failed_message"],
        ) from error

    if not isinstance(payload, dict):
        raise CognitoSignInError(
            resolved_provider_config["failed_code"],
            resolved_provider_config["failed_message"],
        )

    access_token = str(payload.get("access_token") or "")
    id_token = str(payload.get("id_token") or "")
    refresh_token = str(payload.get("refresh_token") or "")
    expires_in = get_cognito_oauth_expires_in(payload.get("expires_in"))

    if not access_token or not id_token or not refresh_token:
        raise CognitoSignInError(
            resolved_provider_config["failed_code"],
            resolved_provider_config["failed_message"],
        )

    return {
        "AccessToken": access_token,
        "ExpiresIn": expires_in,
        "IdToken": id_token,
        "RefreshToken": refresh_token,
    }


def get_cognito_oauth_expires_in(value: Any) -> int:
    try:
        expires_in = int(value)
    except (TypeError, ValueError):
        expires_in = 3600

    return max(1, expires_in)


def require_cognito_oauth_domain() -> str:
    if not COGNITO_OAUTH_DOMAIN:
        raise AuthConfigurationError("Cognito OAuth domain is missing.")

    try:
        parsed_url = urllib.parse.urlparse(COGNITO_OAUTH_DOMAIN)
    except ValueError as error:
        raise AuthConfigurationError("Cognito OAuth domain is invalid.") from error

    if (
        parsed_url.scheme != "https"
        or not parsed_url.netloc
        or parsed_url.username
        or parsed_url.password
        or parsed_url.params
        or parsed_url.query
        or parsed_url.fragment
    ):
        raise AuthConfigurationError("Cognito OAuth domain is invalid.")

    return COGNITO_OAUTH_DOMAIN.rstrip("/")


def validate_cognito_oauth_redirect_uri(redirect_uri: str) -> str:
    allowed_redirect_uris = get_allowed_cognito_oauth_redirect_uris()
    if redirect_uri not in allowed_redirect_uris:
        raise ClientInputError("OAuth redirect URI is not allowed.")

    try:
        parsed_url = urllib.parse.urlparse(redirect_uri)
    except ValueError as error:
        raise ClientInputError("OAuth redirect URI is not allowed.") from error

    if (
        not parsed_url.scheme
        or not parsed_url.netloc
        or parsed_url.username
        or parsed_url.password
        or parsed_url.fragment
    ):
        raise ClientInputError("OAuth redirect URI is not allowed.")

    is_local_http = parsed_url.scheme == "http" and parsed_url.hostname in {
        "127.0.0.1",
        "localhost",
    }
    if parsed_url.scheme != "https" and not is_local_http:
        raise ClientInputError("OAuth redirect URI is not allowed.")

    return redirect_uri


def get_allowed_cognito_oauth_redirect_uris() -> set[str]:
    allowed_redirect_uris = {
        redirect_uri.strip()
        for redirect_uri in COGNITO_OAUTH_REDIRECT_URIS.split(",")
        if redirect_uri.strip()
    }
    if not allowed_redirect_uris:
        raise AuthConfigurationError("Cognito OAuth redirect URIs are missing.")

    return allowed_redirect_uris


def resolve_username_sign_in_email(body: dict[str, Any]) -> dict[str, Any]:
    get_required_string(body, "username")
    raise CognitoSignInError("NotAuthorizedException", "Username or password is not correct.")


def sign_in_with_email(body: dict[str, Any]) -> dict[str, Any]:
    email = normalize_auth_email(get_required_string(body, "email"))
    password = get_required_string(body, "password")

    return initiate_cognito_password_auth(email=email, password=password)


def sign_in_with_username(body: dict[str, Any]) -> dict[str, Any]:
    username = get_required_string(body, "username")
    password = get_required_string(body, "password")
    username_key = normalize_signup_username(username)
    email = get_confirmed_email_for_username(username_key)

    if not email:
        try:
            initiate_cognito_password_auth(
                email=create_dummy_username_sign_in_email(username_key),
                password=password,
            )
        except CognitoSignInError as error:
            raise CognitoSignInError(
                "NotAuthorizedException",
                "Username or password is not correct.",
            ) from error

        raise CognitoSignInError("NotAuthorizedException", "Username or password is not correct.")

    return initiate_cognito_password_auth(email=email, password=password)


def create_dummy_username_sign_in_email(username_key: str) -> str:
    digest = hashlib.sha256(username_key.encode("utf-8")).hexdigest()[:24]

    return f"missing-{digest}@invalid.smile-auth.local"


def initiate_cognito_password_auth(*, email: str, password: str) -> dict[str, Any]:
    client_id = require_cognito_client_id()
    user_pool_id = require_cognito_user_pool_id()

    try:
        result = get_cognito_identity_provider_client().admin_initiate_auth(
            AuthFlow="ADMIN_USER_PASSWORD_AUTH",
            AuthParameters={
                "PASSWORD": password,
                "SECRET_HASH": create_cognito_secret_hash(email),
                "USERNAME": email,
            },
            ClientId=client_id,
            UserPoolId=user_pool_id,
        )
    except ClientError as error:
        code_name = get_client_error_code(error)
        if code_name in {
            "NotAuthorizedException",
            "PasswordResetRequiredException",
            "UserNotConfirmedException",
            "UserNotFoundException",
        }:
            raise CognitoSignInError(
                normalize_cognito_sign_in_error_code(code_name),
                get_generic_sign_in_error_message(code_name),
            ) from error

        if is_cognito_throttle_error_code(code_name):
            raise create_auth_rate_limit_error(AUTH_SIGN_IN_COOLDOWN_SECONDS) from error

        raise

    return {"authenticationResult": result.get("AuthenticationResult", {})}


def refresh_cognito_session(
    body: dict[str, Any],
    event: dict[str, Any] | None = None,
) -> dict[str, Any]:
    refresh_session = get_refresh_session_from_request(body, event)
    refresh_token = refresh_session["refreshToken"]
    user_sub = refresh_session["userSub"]
    client_id = require_cognito_client_id()
    user_pool_id = require_cognito_user_pool_id()

    try:
        result = get_cognito_identity_provider_client().admin_initiate_auth(
            AuthFlow="REFRESH_TOKEN_AUTH",
            AuthParameters={
                "REFRESH_TOKEN": refresh_token,
                "SECRET_HASH": create_cognito_secret_hash(user_sub),
            },
            ClientId=client_id,
            UserPoolId=user_pool_id,
        )
    except ClientError as error:
        code_name = get_client_error_code(error)
        if code_name in {
            "InvalidParameterException",
            "NotAuthorizedException",
            "UserNotFoundException",
        }:
            raise CognitoSignInError(
                "NotAuthorizedException",
                "Username or password is not correct.",
            ) from error

        if is_cognito_throttle_error_code(code_name):
            raise create_auth_rate_limit_error(AUTH_SIGN_IN_COOLDOWN_SECONDS) from error

        raise

    return {"authenticationResult": result.get("AuthenticationResult", {})}


def revoke_cognito_session(
    body: dict[str, Any],
    event: dict[str, Any] | None = None,
) -> dict[str, Any]:
    refresh_token = ""
    if event is not None:
        try:
            refresh_token = get_refresh_session_from_request(body, event)["refreshToken"]
        except AuthenticationError:
            return {"ok": True}

    if not refresh_token:
        return {"ok": True}

    client_id = require_cognito_client_id()
    client_secret = require_cognito_client_secret()

    try:
        get_cognito_identity_provider_client().revoke_token(
            Token=refresh_token,
            ClientId=client_id,
            ClientSecret=client_secret,
        )
    except ClientError as error:
        code_name = get_client_error_code(error)
        if code_name in {
            "InvalidParameterException",
            "UnauthorizedException",
            "UnsupportedOperationException",
            "UnsupportedTokenTypeException",
        }:
            pass
        elif is_cognito_throttle_error_code(code_name):
            raise create_auth_rate_limit_error(AUTH_SIGN_IN_COOLDOWN_SECONDS) from error
        else:
            raise

    return {"ok": True}


def request_password_reset(body: dict[str, Any]) -> dict[str, Any]:
    email = normalize_auth_email(get_required_string(body, "email"))
    locale = get_auth_email_locale_from_body(body)
    client_id = require_cognito_client_id()

    try:
        result = get_cognito_identity_provider_client().forgot_password(
            ClientId=client_id,
            ClientMetadata={"locale": locale},
            SecretHash=create_cognito_secret_hash(email),
            Username=email,
        )
    except ClientError as error:
        code_name = get_client_error_code(error)
        if code_name in {
            "InvalidParameterException",
            "NotAuthorizedException",
            "UserNotFoundException",
        }:
            return build_password_reset_response(email)

        if is_cognito_throttle_error_code(code_name):
            raise create_auth_rate_limit_error(AUTH_RESEND_COOLDOWN_SECONDS) from error

        raise

    return build_password_reset_response(
        email,
        result.get("CodeDeliveryDetails") if isinstance(result, dict) else None,
    )


def confirm_password_reset(body: dict[str, Any]) -> dict[str, Any]:
    email = normalize_auth_email(get_required_string(body, "email"))
    code = get_required_string(body, "code")
    password = get_required_string(body, "password")
    client_id = require_cognito_client_id()

    try:
        get_cognito_identity_provider_client().confirm_forgot_password(
            ClientId=client_id,
            ConfirmationCode=code,
            Password=password,
            SecretHash=create_cognito_secret_hash(email),
            Username=email,
        )
    except ClientError as error:
        code_name = get_client_error_code(error)
        if code_name in {
            "CodeMismatchException",
            "ExpiredCodeException",
            "InvalidPasswordException",
            "TooManyFailedAttemptsException",
        }:
            raise CognitoSignInError(
                code_name,
                get_generic_password_reset_error_message(code_name),
            ) from error

        if is_cognito_throttle_error_code(code_name):
            raise create_auth_rate_limit_error(AUTH_PUBLIC_REQUEST_COOLDOWN_SECONDS) from error

        if code_name in {
            "InvalidParameterException",
            "NotAuthorizedException",
            "UserNotFoundException",
        }:
            raise CognitoSignInError(
                "CodeMismatchException",
                "The verification code is not correct.",
            ) from error

        raise

    return {"ok": True}


def build_password_reset_response(
    email: str,
    code_delivery_details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    delivery_details = code_delivery_details if isinstance(code_delivery_details, dict) else {}

    return {
        "CodeDeliveryDetails": {
            "AttributeName": str(delivery_details.get("AttributeName") or "email"),
            "DeliveryMedium": str(delivery_details.get("DeliveryMedium") or "EMAIL"),
            "Destination": str(
                delivery_details.get("Destination") or mask_email_destination(email)
            ),
        },
    }


def get_generic_password_reset_error_message(code_name: str) -> str:
    if code_name == "ExpiredCodeException":
        return "The verification code has expired. Send a new code."

    if code_name == "InvalidPasswordException":
        return "Password does not meet the password policy."

    if code_name in {"LimitExceededException", "TooManyFailedAttemptsException"}:
        return "Too many failed verification attempts. Send a new code."

    return "The verification code is not correct."


def normalize_cognito_sign_in_error_code(code_name: str) -> str:
    if code_name == "UserNotFoundException":
        return "NotAuthorizedException"

    return code_name


def get_generic_sign_in_error_message(code_name: str) -> str:
    if code_name == "PasswordResetRequiredException":
        return "This account needs a password reset before signing in."

    if code_name == "UserNotConfirmedException":
        return "This account still needs email verification."

    return "Username or password is not correct."


def get_generic_sign_in_error_body() -> dict[str, Any]:
    return {
        "code": "NotAuthorizedException",
        "message": "Username or password is not correct.",
    }


def get_confirmed_email_for_username(username_key: str) -> str:
    item = get_dynamodb_client().get_item(
        TableName=require_username_reservation_table(),
        Key={"usernameKey": {"S": username_key}},
        ConsistentRead=True,
    ).get("Item")

    if not item:
        return ""

    if item.get("status", {}).get("S") != "confirmed":
        return ""

    return item.get("email", {}).get("S", "")


def resend_confirmation_code(body: dict[str, Any]) -> dict[str, Any]:
    email = normalize_auth_email(get_required_string(body, "email"))
    now = int(time.time())
    item = get_pending_signup_item(email)
    locale = get_auth_email_locale_from_body(body, fallback=get_pending_signup_locale(item))

    if not is_active_signup_record(item, now):
        return build_confirmation_resend_response(now + AUTH_RESEND_COOLDOWN_SECONDS)

    existing_next_allowed_at = get_number_attribute(item or {}, "nextAllowedAt")
    if existing_next_allowed_at and existing_next_allowed_at > now:
        raise AuthCooldownError(existing_next_allowed_at - now, existing_next_allowed_at)

    if is_existing_signup_cooldown_item(item):
        return build_confirmation_resend_response(put_existing_signup_cooldown_item(email, now))

    code = create_confirmation_code()
    code_salt = secrets.token_urlsafe(16)
    next_allowed_at = now + AUTH_RESEND_COOLDOWN_SECONDS
    put_pending_signup_item(
        email=email,
        locale=locale,
        username=get_string_attribute(item or {}, "username"),
        username_key=get_string_attribute(item or {}, "usernameKey"),
        code=code,
        code_salt=code_salt,
        created_at=get_number_attribute(item or {}, "createdAt") or now,
        expires_at=now + AUTH_CONFIRMATION_CODE_TTL_SECONDS,
        next_allowed_at=next_allowed_at,
        attempts=0,
        updated_at=now,
        condition_now=now,
    )
    send_pending_signup_confirmation_email(email, code, locale=locale)

    return build_confirmation_resend_response(next_allowed_at)


def confirm_sign_up(body: dict[str, Any], now: int | None = None) -> dict[str, Any]:
    email = normalize_auth_email(get_required_string(body, "email"))
    code = get_required_string(body, "code")
    password = get_required_string(body, "password")
    request_time = int(time.time()) if now is None else now

    validate_signup_password(password)

    item = get_pending_signup_item(email)
    if not is_active_signup_record(item, request_time):
        raise AuthCodeExpiredError("The verification code has expired. Send a new code.")

    attempts = get_number_attribute(item or {}, "attempts") or 0
    if attempts >= AUTH_CONFIRMATION_MAX_ATTEMPTS:
        raise create_too_many_failed_attempts_error()

    if is_existing_signup_cooldown_item(item):
        increment_pending_signup_attempts(email, request_time)
        raise CognitoSignInError("CodeMismatchException", "The verification code is not correct.")

    code_salt = get_string_attribute(item or {}, "codeSalt")
    expected_code_hash = get_string_attribute(item or {}, "codeHash")
    if hash_confirmation_code(email, code, code_salt) != expected_code_hash:
        increment_pending_signup_attempts(email, request_time)
        raise CognitoSignInError("CodeMismatchException", "The verification code is not correct.")

    username = get_string_attribute(item or {}, "username")
    username_key = get_string_attribute(item or {}, "usernameKey")
    if not username or not username_key:
        raise AuthConfigurationError("Pending sign-up is missing username data.")

    try:
        create_confirmed_cognito_user(email=email, password=password, username=username)
    except ClientError as error:
        code_name = get_client_error_code(error)
        if code_name in {
            "InvalidParameterException",
            "InvalidPasswordException",
            "UsernameExistsException",
        }:
            raise CognitoSignInError(code_name, get_client_error_message(error)) from error

        if is_cognito_throttle_error_code(code_name):
            raise create_auth_rate_limit_error(AUTH_PUBLIC_REQUEST_COOLDOWN_SECONDS) from error

        raise

    confirm_username_reservation_for_values(email, username, request_time)
    delete_pending_signup(email)

    return {"ok": True}


def put_pending_signup_item(
    *,
    attempts: int,
    code: str,
    code_salt: str,
    created_at: int,
    email: str,
    expires_at: int,
    locale: str,
    next_allowed_at: int,
    updated_at: int,
    username: str,
    username_key: str,
    condition_now: int | None = None,
) -> None:
    request: dict[str, Any] = {
        "TableName": require_auth_cooldown_table(),
        "Item": {
            "attempts": {"N": str(attempts)},
            "codeHash": {"S": hash_confirmation_code(email, code, code_salt)},
            "codeSalt": {"S": code_salt},
            "cooldownKey": {"S": create_pending_signup_key(email)},
            "createdAt": {"N": str(created_at)},
            "email": {"S": email},
            "expiresAt": {"N": str(expires_at)},
            "locale": {"S": normalize_auth_email_locale(locale)},
            "nextAllowedAt": {"N": str(next_allowed_at)},
            "status": {"S": "pending"},
            "updatedAt": {"N": str(updated_at)},
            "username": {"S": username.strip()},
            "usernameKey": {"S": username_key},
        },
    }

    if condition_now is not None:
        request["ConditionExpression"] = (
            "attribute_not_exists(cooldownKey) OR expiresAt <= :now OR nextAllowedAt <= :now"
        )
        request["ExpressionAttributeValues"] = {
            ":now": {"N": str(condition_now)},
        }

    try:
        get_dynamodb_client().put_item(**request)
    except ClientError as error:
        if not is_conditional_check_failed(error) or condition_now is None:
            raise

        item = get_pending_signup_item(email)
        next_allowed_at_value = get_number_attribute(item or {}, "nextAllowedAt")
        retry_after_seconds = max(1, (next_allowed_at_value or condition_now + 1) - condition_now)
        raise AuthCooldownError(
            retry_after_seconds,
            next_allowed_at_value or condition_now + retry_after_seconds,
        ) from error


def put_existing_signup_cooldown_item(email: str, now: int) -> int:
    next_allowed_at = now + AUTH_RESEND_COOLDOWN_SECONDS

    try:
        get_dynamodb_client().put_item(
            TableName=require_auth_cooldown_table(),
            Item={
                "attempts": {"N": "0"},
                "cooldownKey": {"S": create_pending_signup_key(email)},
                "createdAt": {"N": str(now)},
                "email": {"S": email},
                "expiresAt": {"N": str(now + AUTH_CONFIRMATION_CODE_TTL_SECONDS)},
                "nextAllowedAt": {"N": str(next_allowed_at)},
                "status": {"S": "existing-user"},
                "updatedAt": {"N": str(now)},
            },
            ConditionExpression=(
                "attribute_not_exists(cooldownKey) OR expiresAt <= :now OR nextAllowedAt <= :now"
            ),
            ExpressionAttributeValues={":now": {"N": str(now)}},
        )
    except ClientError as error:
        if not is_conditional_check_failed(error):
            raise

        item = get_pending_signup_item(email)
        next_allowed_at_value = get_number_attribute(item or {}, "nextAllowedAt")
        retry_after_seconds = max(1, (next_allowed_at_value or now + 1) - now)
        raise AuthCooldownError(
            retry_after_seconds,
            next_allowed_at_value or now + retry_after_seconds,
        ) from error

    return next_allowed_at


def increment_pending_signup_attempts(email: str, now: int) -> None:
    try:
        get_dynamodb_client().update_item(
            TableName=require_auth_cooldown_table(),
            Key={"cooldownKey": {"S": create_pending_signup_key(email)}},
            UpdateExpression="SET updatedAt = :now ADD attempts :one",
            ConditionExpression=(
                "(#status = :pending OR #status = :existing) "
                "AND expiresAt > :now "
                "AND (attribute_not_exists(attempts) OR attempts < :maxAttempts)"
            ),
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":maxAttempts": {"N": str(AUTH_CONFIRMATION_MAX_ATTEMPTS)},
                ":now": {"N": str(now)},
                ":one": {"N": "1"},
                ":existing": {"S": "existing-user"},
                ":pending": {"S": "pending"},
            },
        )
    except ClientError as error:
        if not is_conditional_check_failed(error):
            raise

        item = get_pending_signup_item(email)
        if is_active_pending_signup(item, now):
            attempts = get_number_attribute(item or {}, "attempts") or 0
            if attempts >= AUTH_CONFIRMATION_MAX_ATTEMPTS:
                raise create_too_many_failed_attempts_error() from error

        raise AuthCodeExpiredError("The verification code has expired. Send a new code.") from error


def get_pending_signup_item(email: str) -> dict[str, Any] | None:
    return get_dynamodb_client().get_item(
        TableName=require_auth_cooldown_table(),
        Key={"cooldownKey": {"S": create_pending_signup_key(email)}},
        ConsistentRead=True,
    ).get("Item")


def is_active_pending_signup(item: dict[str, Any] | None, now: int) -> bool:
    return is_active_signup_record(item, now) and not is_existing_signup_cooldown_item(item)


def is_active_signup_record(item: dict[str, Any] | None, now: int) -> bool:
    if not item:
        return False

    status = item.get("status", {}).get("S")
    if status not in {"existing-user", "pending"}:
        return False

    expires_at = get_number_attribute(item, "expiresAt")
    return expires_at is not None and expires_at > now


def is_existing_signup_cooldown_item(item: dict[str, Any] | None) -> bool:
    return bool(item and item.get("status", {}).get("S") == "existing-user")


def delete_pending_signup(email: str) -> None:
    get_dynamodb_client().delete_item(
        TableName=require_auth_cooldown_table(),
        Key={"cooldownKey": {"S": create_pending_signup_key(email)}},
    )


def release_pending_username_reservation(item: dict[str, Any] | None, email: str) -> None:
    if not item:
        return

    username_key = get_string_attribute(item, "usernameKey")
    if username_key:
        delete_pending_username_reservation(username_key, email)


def delete_pending_username_reservation(username_key: str, email: str) -> None:
    try:
        get_dynamodb_client().delete_item(
            TableName=require_username_reservation_table(),
            Key={"usernameKey": {"S": username_key}},
            ConditionExpression="email = :email AND #status = :status",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":email": {"S": email},
                ":status": {"S": "pending"},
            },
        )
    except ClientError as error:
        if not is_conditional_check_failed(error):
            raise


def send_pending_signup_confirmation_email(
    email: str,
    code: str,
    *,
    locale: str = AUTH_EMAIL_DEFAULT_LOCALE,
) -> None:
    message = build_cognito_email_message("CustomEmailSender_SignUp", code, locale=locale)
    send_resend_email(
        recipient=email,
        subject=message["subject"],
        template_id=message["template_id"],
        template_variables=message["variables"],
    )


def create_confirmed_cognito_user(*, email: str, password: str, username: str) -> None:
    require_cognito_user_pool_id()
    client = get_cognito_identity_provider_client()
    user_created = False

    try:
        client.admin_create_user(
            MessageAction="SUPPRESS",
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "name", "Value": username.strip()},
            ],
            Username=email,
            UserPoolId=COGNITO_USER_POOL_ID,
        )
        user_created = True
        client.admin_set_user_password(
            Password=password,
            Permanent=True,
            Username=email,
            UserPoolId=COGNITO_USER_POOL_ID,
        )
    except ClientError:
        if user_created:
            try:
                client.admin_delete_user(UserPoolId=COGNITO_USER_POOL_ID, Username=email)
            except ClientError:
                pass
        raise


def cognito_user_exists(email: str) -> bool:
    require_cognito_user_pool_id()

    try:
        get_cognito_identity_provider_client().admin_get_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=email,
        )
    except ClientError as error:
        if get_client_error_code(error) == "UserNotFoundException":
            return False
        if is_cognito_throttle_error_code(get_client_error_code(error)):
            raise create_auth_rate_limit_error(AUTH_SIGN_UP_COOLDOWN_SECONDS) from error
        raise

    return True


def is_cognito_throttle_error_code(code_name: str) -> bool:
    return code_name in COGNITO_THROTTLE_ERROR_CODES


def create_auth_rate_limit_error(
    cooldown_seconds: int = AUTH_PUBLIC_REQUEST_COOLDOWN_SECONDS,
    now: int | None = None,
) -> AuthRateLimitError:
    request_time = int(time.time()) if now is None else now
    retry_after_seconds = max(1, cooldown_seconds)

    return AuthRateLimitError(
        retry_after_seconds,
        request_time + retry_after_seconds,
    )


def create_cognito_secret_hash(username: str) -> str:
    client_id = require_cognito_client_id()
    client_secret = require_cognito_client_secret()
    digest = hmac.new(
        client_secret.encode("utf-8"),
        f"{username}{client_id}".encode("utf-8"),
        hashlib.sha256,
    ).digest()

    return base64.b64encode(digest).decode("utf-8")


def validate_signup_password(password: str) -> None:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise CognitoSignInError(
            "InvalidPasswordException",
            f"Password must be at least {PASSWORD_MIN_LENGTH} characters.",
        )

    if not re.search(r"[a-z]", password) or not re.search(r"[A-Z]", password):
        raise CognitoSignInError(
            "InvalidPasswordException",
            "Password must include lowercase and uppercase letters.",
        )

    if not re.search(r"[0-9]", password):
        raise CognitoSignInError(
            "InvalidPasswordException",
            "Password must include a number.",
        )

    if not any(character in PASSWORD_SYMBOLS for character in password):
        raise CognitoSignInError(
            "InvalidPasswordException",
            "Password must include a symbol.",
        )


def create_too_many_failed_attempts_error() -> CognitoSignInError:
    return CognitoSignInError(
        "TooManyFailedAttemptsException",
        "Too many failed verification attempts. Send a new code.",
    )


def create_confirmation_code() -> str:
    return f"{secrets.randbelow(10**AUTH_CONFIRMATION_CODE_DIGITS):0{AUTH_CONFIRMATION_CODE_DIGITS}d}"


def hash_confirmation_code(email: str, code: str, salt: str) -> str:
    pepper = require_auth_confirmation_code_pepper()
    message = f"{salt}:{email}:{code}".encode("utf-8")
    return hmac.new(
        pepper.encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()


def require_auth_confirmation_code_pepper() -> str:
    pepper = AUTH_CONFIRMATION_CODE_PEPPER.strip()
    if len(pepper) < AUTH_CONFIRMATION_CODE_PEPPER_MIN_LENGTH:
        raise AuthConfigurationError("Confirmation code pepper is missing or too short.")

    return pepper


def create_pending_signup_key(email: str) -> str:
    return create_auth_cooldown_key("pending-signup", email)


def mask_email_destination(email: str) -> str:
    local_part, _, domain = email.partition("@")
    if not local_part or not domain:
        return email

    if len(local_part) <= 2:
        masked_local = f"{local_part[0]}***"
    else:
        masked_local = f"{local_part[0]}***{local_part[-1]}"

    return f"{masked_local}@{domain}"


def reserve_confirmation_resend(email: str, now: int) -> int:
    cooldown_key = create_auth_cooldown_key("confirmation-resend", email)
    next_allowed_at = now + AUTH_RESEND_COOLDOWN_SECONDS

    try:
        get_dynamodb_client().put_item(
            TableName=require_auth_cooldown_table(),
            Item={
                "cooldownKey": {"S": cooldown_key},
                "expiresAt": {"N": str(now + AUTH_COOLDOWN_TTL_SECONDS)},
                "nextAllowedAt": {"N": str(next_allowed_at)},
                "updatedAt": {"N": str(now)},
            },
            ConditionExpression=(
                "attribute_not_exists(cooldownKey) OR nextAllowedAt <= :now"
            ),
            ExpressionAttributeValues={":now": {"N": str(now)}},
        )
    except ClientError as error:
        if not is_conditional_check_failed(error):
            raise

        item = get_dynamodb_client().get_item(
            TableName=require_auth_cooldown_table(),
            Key={"cooldownKey": {"S": cooldown_key}},
            ConsistentRead=True,
        ).get("Item", {})
        existing_next_allowed_at = get_number_attribute(item, "nextAllowedAt") or next_allowed_at
        retry_after_seconds = max(1, existing_next_allowed_at - now)
        raise AuthCooldownError(retry_after_seconds, existing_next_allowed_at) from error

    return next_allowed_at


def record_confirmation_code_expiry(event: dict[str, Any], now: int | None = None) -> int | None:
    trigger_source = event.get("triggerSource")

    if trigger_source not in {"CustomEmailSender_ResendCode", "CustomEmailSender_SignUp"}:
        return None

    email = normalize_auth_email(get_cognito_user_attribute(event, "email"))
    issued_at = int(time.time()) if now is None else now
    expires_at = issued_at + AUTH_CONFIRMATION_CODE_TTL_SECONDS
    cooldown_key = create_auth_cooldown_key("confirmation-code-expiry", email)

    get_dynamodb_client().put_item(
        TableName=require_auth_cooldown_table(),
        Item={
            "cooldownKey": {"S": cooldown_key},
            "expiresAt": {"N": str(expires_at)},
            "issuedAt": {"N": str(issued_at)},
            "triggerSource": {"S": str(trigger_source)},
        },
    )

    return expires_at


def assert_confirmation_code_is_active(email: str, now: int) -> None:
    item = get_dynamodb_client().get_item(
        TableName=require_auth_cooldown_table(),
        Key={"cooldownKey": {"S": create_auth_cooldown_key("confirmation-code-expiry", email)}},
        ConsistentRead=True,
    ).get("Item")

    expires_at = get_number_attribute(item or {}, "expiresAt")

    if not expires_at or expires_at <= now:
        raise AuthCodeExpiredError(
            "The verification code has expired. Send a new code."
        )


def build_confirmation_resend_response(next_allowed_at: int) -> dict[str, Any]:
    return {
        "cooldownSeconds": AUTH_RESEND_COOLDOWN_SECONDS,
        "nextAllowedAt": next_allowed_at,
        "ok": True,
    }


def normalize_auth_email(email: str) -> str:
    normalized_email = email.strip().lower()

    if not EMAIL_PATTERN.fullmatch(normalized_email):
        raise ClientInputError("Email is not valid.")

    return normalized_email


def normalize_optional_auth_email(email: str) -> str:
    normalized_email = email.strip().lower()

    return normalized_email if EMAIL_PATTERN.fullmatch(normalized_email) else ""


def get_auth_email_locale_from_body(
    body: dict[str, Any],
    *,
    fallback: str = AUTH_EMAIL_DEFAULT_LOCALE,
) -> str:
    return normalize_auth_email_locale(get_optional_string(body, "locale") or fallback)


def get_cognito_email_locale(event: dict[str, Any]) -> str:
    request = event.get("request", {})
    client_metadata = request.get("clientMetadata", {}) if isinstance(request, dict) else {}
    locale = client_metadata.get("locale") if isinstance(client_metadata, dict) else None

    return normalize_auth_email_locale(locale if isinstance(locale, str) else None)


def get_pending_signup_locale(item: dict[str, Any] | None) -> str:
    return normalize_auth_email_locale(get_string_attribute(item or {}, "locale"))


def normalize_auth_email_locale(value: str | None) -> str:
    locale = (value or "").strip().lower().replace("_", "-")
    if locale == "en" or locale.startswith("en-"):
        return "en"

    if locale == "id" or locale.startswith("id-"):
        return "id"

    return AUTH_EMAIL_DEFAULT_LOCALE


def create_auth_cooldown_key(scope: str, value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()

    return f"{scope}#{digest}"


def enforce_public_auth_rate_limit(
    event: dict[str, Any],
    scope: str,
    identifier: str | None = None,
    *,
    cooldown_seconds: int = AUTH_PUBLIC_REQUEST_COOLDOWN_SECONDS,
    now: int | None = None,
) -> None:
    request_time = int(time.time()) if now is None else now
    source = get_request_source(event)
    reserve_auth_rate_limit(
        f"{scope}:source",
        source,
        cooldown_seconds=cooldown_seconds,
        now=request_time,
    )

    normalized_identifier = (identifier or "").strip().lower()
    if normalized_identifier:
        reserve_auth_rate_limit(
            f"{scope}:identifier",
            normalized_identifier,
            cooldown_seconds=cooldown_seconds,
            now=request_time,
        )


def enforce_public_auth_identifier_rate_limit(
    scope: str,
    identifier: str | None = None,
    *,
    cooldown_seconds: int = AUTH_PUBLIC_REQUEST_COOLDOWN_SECONDS,
    now: int | None = None,
) -> None:
    normalized_identifier = (identifier or "").strip().lower()
    if not normalized_identifier:
        return

    request_time = int(time.time()) if now is None else now
    reserve_auth_rate_limit(
        f"{scope}:identifier",
        normalized_identifier,
        cooldown_seconds=cooldown_seconds,
        now=request_time,
    )


def reserve_auth_rate_limit(
    scope: str,
    value: str,
    *,
    cooldown_seconds: int,
    now: int,
) -> int:
    cooldown_key = create_auth_cooldown_key(f"rate-limit:{scope}", value or "unknown")
    next_allowed_at = now + max(1, cooldown_seconds)

    try:
        get_dynamodb_client().put_item(
            TableName=require_auth_cooldown_table(),
            Item={
                "cooldownKey": {"S": cooldown_key},
                "expiresAt": {"N": str(now + AUTH_COOLDOWN_TTL_SECONDS)},
                "nextAllowedAt": {"N": str(next_allowed_at)},
                "updatedAt": {"N": str(now)},
            },
            ConditionExpression="attribute_not_exists(cooldownKey) OR nextAllowedAt <= :now",
            ExpressionAttributeValues={":now": {"N": str(now)}},
        )
    except ClientError as error:
        if not is_conditional_check_failed(error):
            raise

        item = get_dynamodb_client().get_item(
            TableName=require_auth_cooldown_table(),
            Key={"cooldownKey": {"S": cooldown_key}},
            ConsistentRead=True,
        ).get("Item", {})
        existing_next_allowed_at = get_number_attribute(item, "nextAllowedAt") or next_allowed_at
        retry_after_seconds = max(1, existing_next_allowed_at - now)
        raise AuthRateLimitError(retry_after_seconds, existing_next_allowed_at) from error

    return next_allowed_at


def enforce_public_auth_burst_limit(
    event: dict[str, Any],
    scope: str,
    identifier: str | None = None,
    *,
    max_requests: int,
    window_seconds: int,
    now: int | None = None,
) -> None:
    request_time = int(time.time()) if now is None else now
    source = get_request_source(event)
    reserve_auth_burst_limit(
        f"{scope}:source",
        source,
        max_requests=max_requests,
        now=request_time,
        window_seconds=window_seconds,
    )

    normalized_identifier = (identifier or "").strip().lower()
    if normalized_identifier:
        reserve_auth_burst_limit(
            f"{scope}:identifier",
            normalized_identifier,
            max_requests=max_requests,
            now=request_time,
            window_seconds=window_seconds,
        )


def reserve_auth_burst_limit(
    scope: str,
    value: str,
    *,
    max_requests: int,
    now: int,
    window_seconds: int,
) -> None:
    normalized_max_requests = max(1, max_requests)
    normalized_window_seconds = max(1, window_seconds)
    cooldown_key = create_auth_cooldown_key(f"rate-limit-burst:{scope}", value or "unknown")
    existing_item = get_dynamodb_client().get_item(
        TableName=require_auth_cooldown_table(),
        Key={"cooldownKey": {"S": cooldown_key}},
        ConsistentRead=True,
    ).get("Item", {})
    existing_window_expires_at = get_number_attribute(existing_item, "windowExpiresAt")
    existing_request_count = get_number_attribute(existing_item, "requestCount") or 0

    if existing_window_expires_at and existing_window_expires_at > now:
        if existing_request_count >= normalized_max_requests:
            raise AuthRateLimitError(
                max(1, existing_window_expires_at - now),
                existing_window_expires_at,
            )

        request_count = existing_request_count + 1
        window_expires_at = existing_window_expires_at
    else:
        request_count = 1
        window_expires_at = now + normalized_window_seconds

    try:
        get_dynamodb_client().put_item(
            TableName=require_auth_cooldown_table(),
            Item={
                "cooldownKey": {"S": cooldown_key},
                "expiresAt": {"N": str(window_expires_at + AUTH_COOLDOWN_TTL_SECONDS)},
                "requestCount": {"N": str(request_count)},
                "updatedAt": {"N": str(now)},
                "windowExpiresAt": {"N": str(window_expires_at)},
            },
            ConditionExpression=(
                "attribute_not_exists(cooldownKey) OR "
                "windowExpiresAt <= :now OR requestCount < :maxRequests"
            ),
            ExpressionAttributeValues={
                ":maxRequests": {"N": str(normalized_max_requests)},
                ":now": {"N": str(now)},
            },
        )
    except ClientError as error:
        if not is_conditional_check_failed(error):
            raise

        item = get_dynamodb_client().get_item(
            TableName=require_auth_cooldown_table(),
            Key={"cooldownKey": {"S": cooldown_key}},
            ConsistentRead=True,
        ).get("Item", {})
        window_expires_at = get_number_attribute(item, "windowExpiresAt") or (
            now + normalized_window_seconds
        )
        raise AuthRateLimitError(max(1, window_expires_at - now), window_expires_at) from error


def get_number_attribute(item: dict[str, Any], name: str) -> int | None:
    value = item.get(name, {}).get("N") if isinstance(item, dict) else None

    if isinstance(value, str) and value.lstrip("-").isdigit():
        return int(value)

    return None


def get_string_attribute(item: dict[str, Any], name: str) -> str:
    value = item.get(name, {}).get("S") if isinstance(item, dict) else None

    return value if isinstance(value, str) else ""


def download_archive(object_key: str) -> bytes:
    s3_client = get_s3_client()
    head = s3_client.head_object(Bucket=UPLOAD_BUCKET, Key=object_key)
    content_length = int(head.get("ContentLength", 0))
    if content_length <= 0:
        raise ClientInputError("Uploaded ZIP is empty.")
    if content_length > MAX_ZIP_BYTES:
        raise ClientInputError("Uploaded ZIP is too large for this lesson.")

    obj = s3_client.get_object(Bucket=UPLOAD_BUCKET, Key=object_key)
    return obj["Body"].read()


def inspect_zip_bytes(archive: bytes, expected_csv_path: str | None = None) -> dict[str, Any]:
    extracted_csv = extract_csv_from_zip(archive, expected_csv_path)
    columns, preview_rows = read_csv_preview(extracted_csv["content"])

    return {
        "columns": columns,
        "csvPath": extracted_csv["csvPath"],
        "fileName": extracted_csv["fileName"],
        "previewRows": preview_rows,
    }


def extract_csv_from_zip(
    archive: bytes,
    expected_csv_path: str | None = None,
) -> dict[str, Any]:
    if len(archive) > MAX_ZIP_BYTES:
        raise ClientInputError("Uploaded ZIP is too large for this lesson.")

    with zipfile.ZipFile(io.BytesIO(archive)) as zip_file:
        infos = zip_file.infolist()
        if len(infos) > MAX_ZIP_ENTRIES:
            raise ClientInputError("ZIP contains too many files for this lesson.")

        uncompressed_size = sum(info.file_size for info in infos)
        if uncompressed_size > MAX_UNZIPPED_BYTES:
            raise ClientInputError("ZIP contents are too large for this lesson.")

        csv_info = find_csv_entry(infos, expected_csv_path)
        if csv_info is None:
            raise ClientInputError("No CSV file was found in the uploaded ZIP.")

        with zip_file.open(csv_info) as file:
            content = file.read()

    return {
        "content": content,
        "csvPath": csv_info.filename,
        "fileName": csv_info.filename.rsplit("/", 1)[-1],
    }


def find_csv_entry(
    infos: list[zipfile.ZipInfo],
    expected_csv_path: str | None = None,
) -> zipfile.ZipInfo | None:
    candidates = [
        info
        for info in infos
        if not info.is_dir()
        and info.filename.lower().endswith(".csv")
        and "__macosx/" not in info.filename.lower()
        and not is_unsafe_zip_path(info.filename)
    ]

    if expected_csv_path:
        normalized_expected = normalize_data_path(expected_csv_path)
        for info in candidates:
            if info.filename == normalized_expected:
                return info
        raise ClientInputError("The requested CSV path was not found in the uploaded ZIP.")

    return sorted(candidates, key=lambda info: info.filename)[0] if candidates else None


def read_csv_preview(content: bytes) -> tuple[list[str], list[list[str]]]:
    text = decode_csv_sample(content[:65536])
    rows = list(csv.reader(io.StringIO(text)))
    if not rows:
        raise ClientInputError("CSV file is empty.")

    columns = rows[0]
    preview_rows = rows[1:6]
    return columns, preview_rows


def decode_csv_sample(sample: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return sample.decode(encoding)
        except UnicodeDecodeError:
            continue

    raise ClientInputError("CSV encoding is not readable.")


def validate_pandas_loading_code(code: str, expected_path: str) -> dict[str, Any]:
    try:
        tree = ast.parse(code)
    except SyntaxError as error:
        return invalid_code_result(
            format_python_syntax_error(error),
            [create_syntax_error_diagnostic(error)],
        )

    body = [node for node in tree.body if not isinstance(node, ast.Pass)]

    if len(body) != 3:
        return invalid_code_result("Use exactly the import, read_csv assignment, and df.head() lines.")

    import_node, assign_node, head_node = body
    if not is_import_pandas_as_pd(import_node):
        return invalid_code_result("Start with `import pandas as pd`.")

    if not is_expected_read_csv_assignment(assign_node, expected_path):
        return invalid_code_result("Load the extracted CSV with the expected `pd.read_csv(...)` path.")

    if not is_df_head_expression(head_node):
        return invalid_code_result("End with `df.head()`.")

    return {
        "message": "Kode Pandas untuk memuat CSV sudah benar.",
        "score": 100,
        "status": "correct",
    }


def run_pandas_loading_code(code: str, expected_path: str, csv_content: bytes) -> dict[str, Any]:
    try:
        tree = ast.parse(code)
    except SyntaxError as error:
        return invalid_code_result(
            format_python_syntax_error(error),
            [create_syntax_error_diagnostic(error)],
        )

    runtime_plan, diagnostics = get_restricted_pandas_runtime_plan(tree)
    if diagnostics:
        file_not_found_result = get_read_csv_file_not_found_result(
            runtime_plan,
            expected_path,
            diagnostics,
        )
        if file_not_found_result:
            return file_not_found_result

        first_diagnostic = diagnostics[0]
        return invalid_code_result(
            format_restricted_runtime_error(first_diagnostic["message"]),
            diagnostics,
        )

    try:
        import pandas as pd

        with tempfile.TemporaryDirectory() as sandbox_dir:
            write_runtime_csv(sandbox_dir, expected_path, csv_content)
            head = run_restricted_pandas_plan(runtime_plan, sandbox_dir, pd)
    except Exception as error:
        return invalid_code_result(
            f"Python runtime error: {type(error).__name__}: {error}",
            [runtime_plan["readCsvDiagnostic"]] if runtime_plan.get("readCsvDiagnostic") else [],
        )

    return {
        "columns": [str(column) for column in head.columns.tolist()],
        "message": "Pandas code executed successfully.",
        "previewRows": dataframe_rows_to_strings(head, pd),
        "score": 100,
        "status": "correct",
    }


def run_restricted_pandas_plan(
    runtime_plan: dict[str, Any],
    sandbox_dir: str,
    pd_module: Any,
) -> Any:
    old_cwd = os.getcwd()

    try:
        os.chdir(sandbox_dir)
        dataframe = pd_module.read_csv(runtime_plan["readCsvPath"])
        head_rows = runtime_plan.get("headRows")

        return dataframe.head(head_rows) if isinstance(head_rows, int) else dataframe.head()
    finally:
        os.chdir(old_cwd)


def get_read_csv_file_not_found_result(
    runtime_plan: dict[str, Any],
    expected_path: str,
    diagnostics: list[dict[str, Any]],
) -> dict[str, Any] | None:
    read_csv_path = runtime_plan.get("readCsvPath")

    if (
        not runtime_plan.get("importAllowed")
        or not isinstance(read_csv_path, str)
        or not read_csv_path
        or read_csv_path == expected_path
        or is_unsafe_runtime_read_path(read_csv_path)
    ):
        return None

    read_csv_diagnostic = runtime_plan.get("readCsvDiagnostic")
    if isinstance(read_csv_diagnostic, dict):
        read_csv_diagnostic = {
            **read_csv_diagnostic,
            "message": f"FileNotFoundError: No such file or directory: '{read_csv_path}'",
        }
        diagnostics = [read_csv_diagnostic, *diagnostics]

    return invalid_code_result(
        f"Python runtime error: FileNotFoundError: [Errno 2] No such file or directory: '{read_csv_path}'",
        dedupe_diagnostics(diagnostics),
    )


def write_runtime_csv(sandbox_dir: str, expected_path: str, csv_content: bytes) -> None:
    normalized_path = expected_path.strip().replace("\\", "/")
    if is_unsafe_runtime_read_path(normalized_path):
        raise ClientInputError("CSV path is not safe for this lesson runtime.")

    destination = Path(sandbox_dir) / normalized_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(csv_content)


def get_restricted_pandas_runtime_plan(tree: ast.Module) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    body = [node for node in tree.body if not isinstance(node, ast.Pass)]
    diagnostics: list[dict[str, Any]] = []

    import_node = body[0] if len(body) > 0 else tree
    assign_node = body[1] if len(body) > 1 else tree
    pandas_alias = get_pandas_import_alias(import_node) if isinstance(import_node, ast.Import) else None
    import_allowed = pandas_alias is not None
    if not import_allowed:
        diagnostics.append(create_node_diagnostic(import_node, "Use an import like `import pandas as pd`."))
        pandas_alias = "pd"

    if not isinstance(assign_node, ast.Assign):
        diagnostics.append(
            create_node_diagnostic(
                assign_node,
                f"Load the CSV with an assignment like `df = {pandas_alias}.read_csv(...)`.",
            )
        )
        target_name = "df"
        read_csv_path = ""
        read_csv_diagnostic = None
    else:
        target_name, read_csv_path, read_csv_diagnostic, assignment_diagnostics = (
            get_restricted_read_csv_assignment(assign_node, pandas_alias)
        )
        diagnostics.extend(assignment_diagnostics)

    head_rows = None
    if len(body) > 2:
        head_node = body[2]
        head_rows, head_diagnostics = get_restricted_head_expression(
            head_node,
            target_name or "df",
            pandas_alias,
        )
        diagnostics.extend(head_diagnostics)
    else:
        diagnostics.append(create_missing_output_diagnostic(body, tree, target_name or "df"))

    if len(body) > 3:
        diagnostics.extend(
            create_node_diagnostic(
                extra_node,
                f"Only one output expression is allowed after `{pandas_alias}.read_csv(...)`.",
            )
            for extra_node in body[3:]
        )

    return {
        "headRows": head_rows,
        "importAllowed": import_allowed,
        "readCsvDiagnostic": read_csv_diagnostic,
        "readCsvPath": read_csv_path,
    }, diagnostics


def get_restricted_read_csv_assignment(
    node: ast.Assign,
    pandas_alias: str,
) -> tuple[str, str, dict[str, Any] | None, list[dict[str, Any]]]:
    diagnostics: list[dict[str, Any]] = []

    if len(node.targets) != 1 or not isinstance(node.targets[0], ast.Name):
        return "", "", None, [
            create_node_diagnostic(node, "Store the CSV dataframe in one variable, for example `df`.")
        ]

    target_name = node.targets[0].id
    if target_name.startswith("__"):
        diagnostics.append(create_node_diagnostic(node.targets[0], "Private Python names are not allowed."))

    value = node.value
    if (
        not isinstance(value, ast.Call)
        or not isinstance(value.func, ast.Attribute)
        or not isinstance(value.func.value, ast.Name)
        or value.func.value.id != pandas_alias
        or value.func.attr != "read_csv"
    ):
        diagnostics.append(
            create_node_diagnostic(
                get_call_diagnostic_node(value),
                f"Only `{pandas_alias}.read_csv(...)` can load the CSV in this lesson runtime.",
            )
        )
        return target_name, "", None, diagnostics

    if value.keywords:
        diagnostics.extend(
            create_node_diagnostic(
                keyword,
                f"`{pandas_alias}.read_csv(...)` keyword arguments are not enabled yet.",
            )
            for keyword in value.keywords
        )

    if len(value.args) != 1 or not isinstance(value.args[0], ast.Constant):
        diagnostics.append(
            create_node_diagnostic(value, f"`{pandas_alias}.read_csv(...)` needs one literal CSV path.")
        )
        return target_name, "", None, diagnostics

    read_csv_path = value.args[0].value
    read_csv_diagnostic = create_node_diagnostic(
        value.args[0],
        f"CSV path used by `{pandas_alias}.read_csv(...)`.",
    )
    if not isinstance(read_csv_path, str):
        diagnostics.append(
            create_node_diagnostic(
                value.args[0],
                f"`{pandas_alias}.read_csv(...)` needs a string CSV path.",
            )
        )
        return target_name, "", read_csv_diagnostic, diagnostics

    if is_unsafe_runtime_read_path(read_csv_path):
        diagnostics.append(
            create_node_diagnostic(value.args[0], "That CSV path is outside the lesson runtime workspace.")
        )

    return target_name, read_csv_path, read_csv_diagnostic, diagnostics


def get_restricted_head_expression(
    node: ast.AST,
    target_name: str,
    pandas_alias: str,
) -> tuple[int | None, list[dict[str, Any]]]:
    diagnostics: list[dict[str, Any]] = []

    if not isinstance(node, ast.Expr):
        return None, [
            create_node_diagnostic(
                node,
                f"Put `{target_name}.head()` on the last line so the runtime can display output.",
            )
        ]

    value = node.value
    if (
        isinstance(value, ast.Call)
        and isinstance(value.func, ast.Attribute)
        and isinstance(value.func.value, ast.Name)
        and value.func.attr == "head"
        and value.func.value.id != target_name
    ):
        return None, [
            create_node_diagnostic(
                value.func,
                get_mismatched_head_target_error_message(value.func.value.id, pandas_alias),
            )
        ]

    if (
        not isinstance(value, ast.Call)
        or not isinstance(value.func, ast.Attribute)
        or not isinstance(value.func.value, ast.Name)
        or value.func.value.id != target_name
        or value.func.attr != "head"
    ):
        return None, [
            create_node_diagnostic(
                get_call_diagnostic_node(value),
                f"Only `{target_name}.head()` can produce output in this lesson runtime.",
            )
        ]

    if value.keywords:
        diagnostics.extend(
            create_node_diagnostic(
                keyword,
                f"`{target_name}.head(...)` keyword arguments are not enabled yet.",
            )
            for keyword in value.keywords
        )

    if len(value.args) > 1:
        diagnostics.extend(
            create_node_diagnostic(arg, f"`{target_name}.head(...)` accepts at most one row count.")
            for arg in value.args[1:]
        )
        return None, diagnostics

    if not value.args:
        return None, diagnostics

    head_rows = value.args[0]
    if (
        not isinstance(head_rows, ast.Constant)
        or not isinstance(head_rows.value, int)
        or isinstance(head_rows.value, bool)
    ):
        diagnostics.append(
            create_node_diagnostic(
                head_rows,
                f"`{target_name}.head(...)` row count must be an integer from 1 to 10.",
            )
        )
        return None, diagnostics

    if head_rows.value < 1 or head_rows.value > 10:
        diagnostics.append(
            create_node_diagnostic(
                head_rows,
                f"`{target_name}.head(...)` row count must be between 1 and 10.",
            )
        )
        return None, diagnostics

    return head_rows.value, diagnostics


def create_missing_output_diagnostic(
    body: list[ast.stmt],
    tree: ast.Module,
    target_name: str,
) -> dict[str, Any]:
    message = f"Put `{target_name}.head()` on the last line so the runtime can display output."
    if not body:
        return create_node_diagnostic(tree, message)

    last_node = body[-1]
    diagnostic = create_node_diagnostic(last_node, message)
    end_line = getattr(last_node, "end_lineno", None)
    end_column_offset = getattr(last_node, "end_col_offset", None)

    if isinstance(end_line, int) and end_line >= 1:
        diagnostic["line"] = end_line
    if isinstance(end_column_offset, int) and end_column_offset >= 0:
        diagnostic["column"] = end_column_offset + 1
        diagnostic["length"] = 1

    return diagnostic


def get_call_diagnostic_node(node: ast.AST) -> ast.AST:
    if isinstance(node, ast.Call):
        return node.func

    return node


def get_pandas_import_alias(node: ast.Import) -> str | None:
    if len(node.names) != 1 or node.names[0].name != "pandas":
        return None

    alias = node.names[0].asname
    if not alias or not alias.isidentifier() or alias.startswith("__"):
        return None

    return alias


def is_unsafe_runtime_read_path(path: str) -> bool:
    normalized = path.strip().replace("\\", "/").lower()
    return (
        not normalized
        or normalized.startswith("/")
        or ".." in normalized.split("/")
        or "://" in normalized
    )


def format_python_syntax_error(error: SyntaxError) -> str:
    details = []
    if error.lineno:
        details.append(f"line {error.lineno}")
    if error.offset:
        details.append(f"column {error.offset}")

    location = f" ({', '.join(details)})" if details else ""
    return f"Python runtime error: SyntaxError: {error.msg}{location}."


def format_lesson_runtime_error(message: str) -> str:
    return f"Lesson runtime error: {message}"


def format_restricted_runtime_error(message: str) -> str:
    if message.startswith(("AttributeError:", "NameError:")):
        return f"Python runtime error: {message}"

    return format_lesson_runtime_error(message)


def get_mismatched_head_target_error_message(target_name: str, pandas_alias: str) -> str:
    if target_name == pandas_alias:
        return "AttributeError: module 'pandas' has no attribute 'head'"

    return f"NameError: name '{target_name}' is not defined"


def create_syntax_error_diagnostic(error: SyntaxError) -> dict[str, Any]:
    return {
        "column": max(1, error.offset or 1),
        "length": 1,
        "line": max(1, error.lineno or 1),
        "message": format_python_syntax_error(error),
    }


def create_node_diagnostic(node: ast.AST, message: str) -> dict[str, Any]:
    line = max(1, int(getattr(node, "lineno", 1) or 1))
    column_offset = max(0, int(getattr(node, "col_offset", 0) or 0))
    end_column_offset = getattr(node, "end_col_offset", None)
    length = 1

    if isinstance(end_column_offset, int) and end_column_offset > column_offset:
        length = end_column_offset - column_offset

    return {
        "column": column_offset + 1,
        "length": max(1, length),
        "line": line,
        "message": message,
    }


def dedupe_diagnostics(diagnostics: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unique_diagnostics: list[dict[str, Any]] = []
    seen_locations: set[tuple[int, int, int]] = set()

    for diagnostic in diagnostics:
        location = (
            int(diagnostic.get("line", 1) or 1),
            int(diagnostic.get("column", 1) or 1),
            int(diagnostic.get("length", 1) or 1),
        )
        if location in seen_locations:
            continue

        seen_locations.add(location)
        unique_diagnostics.append(diagnostic)

    return unique_diagnostics


def dataframe_rows_to_strings(dataframe: Any, pd_module: Any) -> list[list[str]]:
    rows: list[list[str]] = []

    for row in dataframe.itertuples(index=False, name=None):
        rows.append([format_pandas_value(value, pd_module) for value in row])

    return rows


def format_pandas_value(value: Any, pd_module: Any) -> str:
    try:
        if bool(pd_module.isna(value)):
            return ""
    except (TypeError, ValueError):
        pass

    return str(value)


def invalid_code_result(
    message: str,
    diagnostics: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "diagnostics": diagnostics or [],
        "message": message,
        "score": 70,
        "status": "partial",
    }


def is_import_pandas_as_pd(node: ast.AST) -> bool:
    return (
        isinstance(node, ast.Import)
        and len(node.names) == 1
        and node.names[0].name == "pandas"
        and node.names[0].asname == "pd"
    )


def is_expected_read_csv_assignment(node: ast.AST, expected_path: str) -> bool:
    if not isinstance(node, ast.Assign) or len(node.targets) != 1:
        return False

    target = node.targets[0]
    value = node.value

    return (
        isinstance(target, ast.Name)
        and target.id == "df"
        and isinstance(value, ast.Call)
        and isinstance(value.func, ast.Attribute)
        and value.func.attr == "read_csv"
        and isinstance(value.func.value, ast.Name)
        and value.func.value.id == "pd"
        and len(value.args) == 1
        and not value.keywords
        and isinstance(value.args[0], ast.Constant)
        and value.args[0].value == expected_path
    )


def is_df_head_expression(node: ast.AST) -> bool:
    if not isinstance(node, ast.Expr) or not isinstance(node.value, ast.Call):
        return False

    call = node.value
    return (
        isinstance(call.func, ast.Attribute)
        and call.func.attr == "head"
        and isinstance(call.func.value, ast.Name)
        and call.func.value.id == "df"
        and not call.args
        and not call.keywords
    )


def build_expected_pandas_code(csv_path: str) -> str:
    return f'import pandas as pd\n\ndf = pd.read_csv("{csv_path}")\ndf.head()'


def sanitize_file_name(file_name: str) -> str:
    name = file_name.rsplit("/", 1)[-1].rsplit("\\", 1)[-1].strip()
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", name)
    if not name:
        name = "dataset.zip"
    if not name.lower().endswith(".zip"):
        name = f"{name}.zip"
    return name[:160]


def is_unsafe_zip_path(path: str) -> bool:
    normalized = path.replace("\\", "/")
    return normalized.startswith("/") or ".." in normalized.split("/")


def normalize_data_path(path: str) -> str:
    normalized = path.strip().replace("\\", "/")
    if normalized.startswith("data/"):
        return normalized.removeprefix("data/")
    return normalized


def require_upload_object_key(body: dict[str, Any], user: dict[str, Any]) -> str:
    object_key = get_required_string(body, "objectKey")
    expected_prefix = f"uploads/{user['sub']}/"
    if not object_key.startswith(expected_prefix):
        raise ClientInputError("Object key is outside your upload area.")
    return object_key


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

    for dict_key in (
        "attempts",
        "lessonAnswers",
        "submittedExerciseAnswers",
    ):
        field_value = value.get(dict_key)
        if field_value is not None and not isinstance(field_value, dict):
            return False

    current_lesson_id = value.get("currentLessonId")
    return current_lesson_id is None or isinstance(current_lesson_id, str)


def get_required_string(body: dict[str, Any], key: str) -> str:
    value = body.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ClientInputError(f"`{key}` is required.")
    return value.strip()


def get_optional_string(body: dict[str, Any], key: str) -> str | None:
    value = body.get(key)
    return value.strip() if isinstance(value, str) and value.strip() else None


def require_learning_progress_table() -> str:
    if not LEARNING_PROGRESS_TABLE:
        raise AuthConfigurationError("Learning progress table is not configured.")

    return LEARNING_PROGRESS_TABLE


def get_s3_client():
    global _s3_client

    if boto3 is None:
        raise RuntimeError("boto3 is required for AWS storage operations.")

    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            config=Config(signature_version="s3v4"),
            endpoint_url=f"https://s3.{AWS_REGION}.amazonaws.com",
            region_name=AWS_REGION,
        )

    return _s3_client


def get_dynamodb_client():
    global _dynamodb_client

    if _dynamodb_client is not None:
        return _dynamodb_client

    if boto3 is None:
        raise RuntimeError("boto3 is required for AWS storage operations.")

    _dynamodb_client = boto3.client(
        "dynamodb",
        config=Config(),
        region_name=AWS_REGION,
    )

    return _dynamodb_client


def get_cognito_identity_provider_client():
    global _cognito_identity_provider_client

    if _cognito_identity_provider_client is not None:
        return _cognito_identity_provider_client

    if boto3 is None:
        raise RuntimeError("boto3 is required for AWS auth operations.")

    _cognito_identity_provider_client = boto3.client(
        "cognito-idp",
        config=Config(),
        region_name=COGNITO_REGION,
    )

    return _cognito_identity_provider_client


def get_secrets_manager_client():
    global _secrets_manager_client

    if _secrets_manager_client is not None:
        return _secrets_manager_client

    if boto3 is None:
        raise RuntimeError("boto3 is required for AWS secret operations.")

    _secrets_manager_client = boto3.client(
        "secretsmanager",
        config=Config(),
        region_name=AWS_REGION,
    )

    return _secrets_manager_client


def get_client_error_code(error: ClientError) -> str:
    code = getattr(error, "response", {}).get("Error", {}).get("Code", "")

    return code if isinstance(code, str) else ""


def get_client_error_message(error: ClientError) -> str:
    message = getattr(error, "response", {}).get("Error", {}).get("Message", "")

    return message if isinstance(message, str) and message else str(error)
