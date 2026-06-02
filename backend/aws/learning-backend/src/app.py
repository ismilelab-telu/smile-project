from __future__ import annotations

import ast
import base64
import binascii
import csv
import hashlib
import html
import io
import json
import os
from pathlib import Path
import re
import secrets
import tempfile
import time
import urllib.error
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
COGNITO_EMAIL_SENDER_KMS_KEY_ARN = os.environ.get("COGNITO_EMAIL_SENDER_KMS_KEY_ARN", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_API_KEY_SECRET_ID = os.environ.get("RESEND_API_KEY_SECRET_ID", "")
RESEND_API_URL = os.environ.get("RESEND_API_URL", "https://api.resend.com/emails")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "Smile Lab <auth@smilelab.me>")
RESEND_REPLY_TO_EMAIL = os.environ.get("RESEND_REPLY_TO_EMAIL", "")
RESEND_REQUEST_TIMEOUT_SECONDS = 10
AUTH_RESEND_COOLDOWN_SECONDS = int(os.environ.get("AUTH_RESEND_COOLDOWN_SECONDS", "30"))
AUTH_CONFIRMATION_CODE_TTL_SECONDS = int(
    os.environ.get("AUTH_CONFIRMATION_CODE_TTL_SECONDS", "300")
)
AUTH_CONFIRMATION_CODE_DIGITS = 6
AUTH_CONFIRMATION_MAX_ATTEMPTS = 5
MAX_ZIP_BYTES = int(os.environ.get("MAX_ZIP_BYTES", "52428800"))
MAX_UNZIPPED_BYTES = int(os.environ.get("MAX_UNZIPPED_BYTES", "104857600"))
MAX_PROGRESS_JSON_BYTES = int(os.environ.get("MAX_PROGRESS_JSON_BYTES", "300000"))
MAX_ZIP_ENTRIES = 512
PRESIGN_EXPIRES_IN_SECONDS = 600
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9._-]+$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USERNAME_RESERVATION_TTL_SECONDS = 24 * 60 * 60
AUTH_COOLDOWN_TTL_SECONDS = 60 * 60

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
            return response(200, start_sign_up(parse_json_body(event)))

        if method == "POST" and path == "/auth/confirmation/resend":
            return response(200, resend_confirmation_code(parse_json_body(event)))

        if method == "POST" and path == "/auth/confirmation/confirm":
            return response(200, confirm_sign_up(parse_json_body(event)))

        if method == "POST" and path == "/auth/username/sign-in":
            return response(200, sign_in_with_username(parse_json_body(event)))

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
    except AuthCodeExpiredError as error:
        return response(400, {"code": "ExpiredCodeException", "message": str(error)})
    except UsernameReservationError as error:
        return response(400, {"code": "InvalidUsernameException", "message": str(error)})
    except CognitoSignInError as error:
        return response(400, {"code": error.code, "message": str(error)})
    except ClientInputError as error:
        return response(400, {"message": str(error)})
    except ClientError:
        return response(502, {"message": "AWS storage operation failed."})
    except zipfile.BadZipFile:
        return response(400, {"message": "The uploaded file is not a readable ZIP archive."})


def handle_cognito_trigger(event: dict[str, Any]) -> dict[str, Any]:
    trigger_source = event.get("triggerSource")

    if isinstance(trigger_source, str) and trigger_source.startswith("CustomEmailSender_"):
        send_cognito_email_with_resend(event)
    elif trigger_source == "PreSignUp_SignUp":
        reserve_username_for_signup(event)
    elif trigger_source == "PostConfirmation_ConfirmSignUp":
        confirm_username_reservation(event)

    return event


def reserve_username_for_signup(event: dict[str, Any]) -> None:
    reserve_username_reservation(
        get_cognito_user_attribute(event, "email").lower(),
        get_cognito_user_attribute(event, "name"),
        int(time.time()),
    )


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
    confirm_username_reservation_for_values(
        get_cognito_user_attribute(event, "email").lower(),
        get_cognito_user_attribute(event, "name"),
        int(time.time()),
    )


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
    message = build_cognito_email_message(event.get("triggerSource", ""), code)
    record_confirmation_code_expiry(event)

    send_resend_email(
        html_body=message["html"],
        recipient=recipient,
        subject=message["subject"],
        text_body=message["text"],
    )


def build_cognito_email_message(trigger_source: Any, code: str) -> dict[str, str]:
    trigger = trigger_source if isinstance(trigger_source, str) else ""
    subject = "Kode verifikasi Smile Lab"
    title = "Verifikasi akun"
    intro = "Masukkan kode ini untuk menyelesaikan verifikasi akun Smile Lab."
    label = "Kode verifikasi"

    if trigger == "CustomEmailSender_ForgotPassword":
        subject = "Kode reset password Smile Lab"
        title = "Reset password"
        intro = "Masukkan kode ini untuk mengatur ulang password akun Smile Lab."
        label = "Kode reset password"
    elif trigger in {
        "CustomEmailSender_UpdateUserAttribute",
        "CustomEmailSender_VerifyUserAttribute",
    }:
        subject = "Kode verifikasi email Smile Lab"
        title = "Verifikasi email"
        intro = "Masukkan kode ini untuk memverifikasi email akun Smile Lab."
    elif trigger == "CustomEmailSender_Authentication":
        subject = "Kode masuk Smile Lab"
        title = "Kode masuk"
        intro = "Masukkan kode ini untuk melanjutkan proses masuk ke Smile Lab."
        label = "Kode masuk"
    elif trigger == "CustomEmailSender_AdminCreateUser":
        subject = "Undangan akun Smile Lab"
        title = "Akun Smile Lab dibuat"
        intro = "Gunakan nilai berikut untuk menyelesaikan akses akun Smile Lab."
        label = "Kode atau password sementara"

    code_line = f"{label}: {code}" if code else "Buka aplikasi Smile Lab untuk melanjutkan."
    text_body = "\n".join(
        [
            title,
            "",
            intro,
            "",
            code_line,
            "",
            "Kalau email tidak muncul, cek folder spam atau junk.",
            "Abaikan email ini jika kamu tidak meminta kode dari Smile Lab.",
        ]
    )

    escaped_title = html.escape(title)
    escaped_intro = html.escape(intro)
    escaped_label = html.escape(label)
    escaped_code = html.escape(code)
    code_block = (
        f"""
        <p style="margin:24px 0 8px;color:#525252;font-size:13px;font-weight:700;">{escaped_label}</p>
        <div style="border:1px solid #d4d4d4;background:#f8fafc;color:#171717;font-size:28px;font-weight:800;letter-spacing:4px;padding:18px 20px;text-align:center;">{escaped_code}</div>
        """
        if code
        else '<p style="margin:24px 0;color:#171717;">Buka aplikasi Smile Lab untuk melanjutkan.</p>'
    )

    html_body = f"""
    <!doctype html>
    <html lang="id">
      <body style="margin:0;background:#ffffff;color:#171717;font-family:Arial,Helvetica,sans-serif;">
        <main style="max-width:520px;margin:0 auto;padding:32px 24px;">
          <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;">{escaped_title}</h1>
          <p style="margin:0;color:#404040;font-size:15px;line-height:1.7;">{escaped_intro}</p>
          {code_block}
          <p style="margin:24px 0 0;color:#525252;font-size:14px;line-height:1.7;">Kalau email tidak muncul, cek folder spam atau junk.</p>
          <p style="margin:12px 0 0;color:#737373;font-size:13px;line-height:1.7;">Abaikan email ini jika kamu tidak meminta kode dari Smile Lab.</p>
        </main>
      </body>
    </html>
    """

    return {"html": html_body, "subject": subject, "text": text_body}


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
    html_body: str,
    recipient: str,
    subject: str,
    text_body: str,
) -> None:
    payload: dict[str, Any] = {
        "from": RESEND_FROM_EMAIL,
        "html": html_body,
        "subject": subject,
        "text": text_body,
        "to": [recipient],
    }

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


def is_conditional_check_failed(error: ClientError) -> bool:
    return get_client_error_code(error) == "ConditionalCheckFailedException"


def response(status_code: int, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {"content-type": "application/json; charset=utf-8"},
        "body": json.dumps(body),
    }


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

    token_use = claims.get("token_use")
    if token_use == "id":
        if claims.get("aud") != COGNITO_CLIENT_ID:
            raise AuthenticationError("Auth token is not for this app.")
    elif token_use == "access":
        if claims.get("client_id") != COGNITO_CLIENT_ID:
            raise AuthenticationError("Auth token is not for this app.")
    else:
        raise AuthenticationError("Auth token type is not supported.")

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
    email = normalize_auth_email(get_required_string(body, "email"))
    username = get_required_string(body, "name")
    password = get_required_string(body, "password")
    request_time = int(time.time()) if now is None else now

    validate_signup_password(password)
    require_cognito_user_pool_id()

    if cognito_user_exists(email):
        raise CognitoSignInError("UsernameExistsException", "An account already exists.")

    username_key = reserve_username_reservation(email, username, request_time)
    code = create_confirmation_code()
    code_salt = secrets.token_urlsafe(16)
    expires_at = request_time + AUTH_CONFIRMATION_CODE_TTL_SECONDS
    next_allowed_at = request_time + AUTH_RESEND_COOLDOWN_SECONDS

    get_dynamodb_client().put_item(
        TableName=require_auth_cooldown_table(),
        Item={
            "attempts": {"N": "0"},
            "codeHash": {"S": hash_confirmation_code(email, code, code_salt)},
            "codeSalt": {"S": code_salt},
            "cooldownKey": {"S": create_pending_signup_key(email)},
            "createdAt": {"N": str(request_time)},
            "email": {"S": email},
            "expiresAt": {"N": str(expires_at)},
            "nextAllowedAt": {"N": str(next_allowed_at)},
            "status": {"S": "pending"},
            "updatedAt": {"N": str(request_time)},
            "username": {"S": username.strip()},
            "usernameKey": {"S": username_key},
        },
    )
    send_pending_signup_confirmation_email(email, code)

    return build_confirmation_resend_response(next_allowed_at) | {
        "CodeDeliveryDetails": {
            "AttributeName": "email",
            "DeliveryMedium": "EMAIL",
            "Destination": mask_email_destination(email),
        },
        "UserConfirmed": False,
    }


def sign_in_with_username(body: dict[str, Any]) -> dict[str, Any]:
    username = get_required_string(body, "username")
    password = get_required_string(body, "password")
    username_key = normalize_signup_username(username)
    email = get_confirmed_email_for_username(username_key)

    if not email:
        raise CognitoSignInError("NotAuthorizedException", "Username or password is not correct.")

    if not COGNITO_CLIENT_ID:
        raise AuthConfigurationError("Cognito client id is missing.")

    try:
        result = get_cognito_identity_provider_client().initiate_auth(
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "PASSWORD": password,
                "USERNAME": email,
            },
            ClientId=COGNITO_CLIENT_ID,
        )
    except ClientError as error:
        code = get_client_error_code(error)
        if code in {
            "NotAuthorizedException",
            "PasswordResetRequiredException",
            "UserNotConfirmedException",
            "UserNotFoundException",
        }:
            raise CognitoSignInError(code, get_client_error_message(error)) from error

        raise

    return {"authenticationResult": result.get("AuthenticationResult", {})}


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

    if not is_active_pending_signup(item, now):
        return build_confirmation_resend_response(now + AUTH_RESEND_COOLDOWN_SECONDS)

    existing_next_allowed_at = get_number_attribute(item or {}, "nextAllowedAt")
    if existing_next_allowed_at and existing_next_allowed_at > now:
        raise AuthCooldownError(existing_next_allowed_at - now, existing_next_allowed_at)

    code = create_confirmation_code()
    code_salt = secrets.token_urlsafe(16)
    next_allowed_at = now + AUTH_RESEND_COOLDOWN_SECONDS
    put_pending_signup_item(
        email=email,
        username=get_string_attribute(item or {}, "username"),
        username_key=get_string_attribute(item or {}, "usernameKey"),
        code=code,
        code_salt=code_salt,
        created_at=get_number_attribute(item or {}, "createdAt") or now,
        expires_at=now + AUTH_CONFIRMATION_CODE_TTL_SECONDS,
        next_allowed_at=next_allowed_at,
        attempts=0,
        updated_at=now,
    )
    send_pending_signup_confirmation_email(email, code)

    return build_confirmation_resend_response(next_allowed_at)


def confirm_sign_up(body: dict[str, Any], now: int | None = None) -> dict[str, Any]:
    email = normalize_auth_email(get_required_string(body, "email"))
    code = get_required_string(body, "code")
    password = get_required_string(body, "password")
    request_time = int(time.time()) if now is None else now

    validate_signup_password(password)

    item = get_pending_signup_item(email)
    if not is_active_pending_signup(item, request_time):
        raise AuthCodeExpiredError("The verification code has expired. Send a new code.")

    attempts = get_number_attribute(item or {}, "attempts") or 0
    if attempts >= AUTH_CONFIRMATION_MAX_ATTEMPTS:
        raise CognitoSignInError(
            "TooManyFailedAttemptsException",
            "Too many failed verification attempts. Send a new code.",
        )

    code_salt = get_string_attribute(item or {}, "codeSalt")
    expected_code_hash = get_string_attribute(item or {}, "codeHash")
    if hash_confirmation_code(email, code, code_salt) != expected_code_hash:
        update_pending_signup_attempts(email, item or {}, attempts + 1, request_time)
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
    next_allowed_at: int,
    updated_at: int,
    username: str,
    username_key: str,
) -> None:
    get_dynamodb_client().put_item(
        TableName=require_auth_cooldown_table(),
        Item={
            "attempts": {"N": str(attempts)},
            "codeHash": {"S": hash_confirmation_code(email, code, code_salt)},
            "codeSalt": {"S": code_salt},
            "cooldownKey": {"S": create_pending_signup_key(email)},
            "createdAt": {"N": str(created_at)},
            "email": {"S": email},
            "expiresAt": {"N": str(expires_at)},
            "nextAllowedAt": {"N": str(next_allowed_at)},
            "status": {"S": "pending"},
            "updatedAt": {"N": str(updated_at)},
            "username": {"S": username.strip()},
            "usernameKey": {"S": username_key},
        },
    )


def update_pending_signup_attempts(
    email: str,
    item: dict[str, Any],
    attempts: int,
    now: int,
) -> None:
    get_dynamodb_client().put_item(
        TableName=require_auth_cooldown_table(),
        Item={
            **item,
            "attempts": {"N": str(attempts)},
            "updatedAt": {"N": str(now)},
        },
    )


def get_pending_signup_item(email: str) -> dict[str, Any] | None:
    return get_dynamodb_client().get_item(
        TableName=require_auth_cooldown_table(),
        Key={"cooldownKey": {"S": create_pending_signup_key(email)}},
        ConsistentRead=True,
    ).get("Item")


def is_active_pending_signup(item: dict[str, Any] | None, now: int) -> bool:
    if not item or item.get("status", {}).get("S") != "pending":
        return False

    expires_at = get_number_attribute(item, "expiresAt")
    return expires_at is not None and expires_at > now


def delete_pending_signup(email: str) -> None:
    get_dynamodb_client().delete_item(
        TableName=require_auth_cooldown_table(),
        Key={"cooldownKey": {"S": create_pending_signup_key(email)}},
    )


def send_pending_signup_confirmation_email(email: str, code: str) -> None:
    message = build_cognito_email_message("CustomEmailSender_SignUp", code)
    send_resend_email(
        html_body=message["html"],
        recipient=email,
        subject=message["subject"],
        text_body=message["text"],
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
        raise

    return True


def validate_signup_password(password: str) -> None:
    if len(password) < 8:
        raise CognitoSignInError(
            "InvalidPasswordException",
            "Password must be at least 8 characters.",
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


def create_confirmation_code() -> str:
    return f"{secrets.randbelow(10**AUTH_CONFIRMATION_CODE_DIGITS):0{AUTH_CONFIRMATION_CODE_DIGITS}d}"


def hash_confirmation_code(email: str, code: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{email}:{code}".encode("utf-8")).hexdigest()


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


def create_auth_cooldown_key(scope: str, value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()

    return f"{scope}#{digest}"


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
