from __future__ import annotations

import ast
import base64
import csv
import io
import json
import os
import re
import time
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


UPLOAD_BUCKET = os.environ.get("UPLOAD_BUCKET", "")
LEARNING_PROGRESS_TABLE = os.environ.get("LEARNING_PROGRESS_TABLE", "")
AWS_REGION = os.environ.get("AWS_REGION", "ap-southeast-1")
COGNITO_REGION = os.environ.get("COGNITO_REGION", AWS_REGION)
COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "")
COGNITO_CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID", "")
MAX_ZIP_BYTES = int(os.environ.get("MAX_ZIP_BYTES", "52428800"))
MAX_UNZIPPED_BYTES = int(os.environ.get("MAX_UNZIPPED_BYTES", "104857600"))
MAX_PROGRESS_JSON_BYTES = int(os.environ.get("MAX_PROGRESS_JSON_BYTES", "300000"))
MAX_ZIP_ENTRIES = 512
PRESIGN_EXPIRES_IN_SECONDS = 600
GUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$")

_s3_client = None
_dynamodb_client = None
_jwks_client = None


class ClientInputError(ValueError):
    pass


class AuthenticationError(ValueError):
    pass


class AuthConfigurationError(RuntimeError):
    pass


def lambda_handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
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
    except ClientInputError as error:
        return response(400, {"message": str(error)})
    except ClientError:
        return response(502, {"message": "AWS storage operation failed."})
    except zipfile.BadZipFile:
        return response(400, {"message": "The uploaded file is not a readable ZIP archive."})


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


def require_learning_backend_user(event: dict[str, Any], body: dict[str, Any]) -> dict[str, Any]:
    if get_header(event, "authorization"):
        return require_authenticated_user(event)

    guest_id = get_optional_string(body, "guestId")
    if not guest_id:
        raise AuthenticationError("Sign in or use a guest session before using this lesson backend.")

    if not GUEST_ID_PATTERN.fullmatch(guest_id):
        raise AuthenticationError("Guest session is not valid.")

    return {
        "email": "",
        "isGuest": True,
        "sub": f"guest/{guest_id}",
    }


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
        TableName=LEARNING_PROGRESS_TABLE,
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
        TableName=LEARNING_PROGRESS_TABLE,
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
    inspection = inspect_zip_bytes(archive, expected_csv_path=csv_path)
    expected_path = f"data/{inspection['csvPath']}"
    validation = validate_pandas_loading_code(submitted_code, expected_path)

    return {
        "columns": inspection["columns"],
        "expectedCode": build_expected_pandas_code(expected_path),
        "message": validation["message"],
        "previewRows": inspection["previewRows"],
        "score": validation["score"],
        "status": validation["status"],
        "tabularFilePath": expected_path,
    }


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

        columns, preview_rows = read_csv_preview(zip_file, csv_info)

    return {
        "columns": columns,
        "csvPath": csv_info.filename,
        "fileName": csv_info.filename.rsplit("/", 1)[-1],
        "previewRows": preview_rows,
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


def read_csv_preview(
    zip_file: zipfile.ZipFile,
    csv_info: zipfile.ZipInfo,
) -> tuple[list[str], list[list[str]]]:
    with zip_file.open(csv_info) as file:
        sample = file.read(65536)

    text = decode_csv_sample(sample)
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
    except SyntaxError:
        return invalid_code_result("Python syntax is not valid.")

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


def invalid_code_result(message: str) -> dict[str, Any]:
    return {"message": message, "score": 70, "status": "partial"}


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

    if boto3 is None:
        raise RuntimeError("boto3 is required for AWS storage operations.")

    if not LEARNING_PROGRESS_TABLE:
        raise AuthConfigurationError("Learning progress table is not configured.")

    if _dynamodb_client is None:
        _dynamodb_client = boto3.client(
            "dynamodb",
            config=Config(),
            region_name=AWS_REGION,
        )

    return _dynamodb_client
