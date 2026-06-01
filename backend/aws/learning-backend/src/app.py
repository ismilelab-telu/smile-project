from __future__ import annotations

import ast
import base64
import csv
import io
import json
import os
from pathlib import Path
import re
import tempfile
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
            format_lesson_runtime_error(first_diagnostic["message"]),
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
    import_allowed = isinstance(import_node, ast.Import) and is_allowed_pandas_import(import_node)
    if not import_allowed:
        diagnostics.append(create_node_diagnostic(import_node, "Only `import pandas as pd` is allowed."))

    if not isinstance(assign_node, ast.Assign):
        diagnostics.append(
            create_node_diagnostic(assign_node, "Load the CSV with an assignment like `df = pd.read_csv(...)`.")
        )
        target_name = "df"
        read_csv_path = ""
        read_csv_diagnostic = None
    else:
        target_name, read_csv_path, read_csv_diagnostic, assignment_diagnostics = (
            get_restricted_read_csv_assignment(assign_node)
        )
        diagnostics.extend(assignment_diagnostics)

    head_rows = None
    if len(body) > 2:
        head_node = body[2]
        head_rows, head_diagnostics = get_restricted_head_expression(head_node, target_name or "df")
        diagnostics.extend(head_diagnostics)
    else:
        diagnostics.append(create_missing_output_diagnostic(body, tree))

    if len(body) > 3:
        diagnostics.extend(
            create_node_diagnostic(
                extra_node,
                "Only one output expression is allowed after `pd.read_csv(...)`.",
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
        or value.func.value.id != "pd"
        or value.func.attr != "read_csv"
    ):
        diagnostics.append(
            create_node_diagnostic(
                get_call_diagnostic_node(value),
                "Only `pd.read_csv(...)` can load the CSV in this lesson runtime.",
            )
        )
        return target_name, "", None, diagnostics

    if value.keywords:
        diagnostics.extend(
            create_node_diagnostic(keyword, "`pd.read_csv(...)` keyword arguments are not enabled yet.")
            for keyword in value.keywords
        )

    if len(value.args) != 1 or not isinstance(value.args[0], ast.Constant):
        diagnostics.append(create_node_diagnostic(value, "`pd.read_csv(...)` needs one literal CSV path."))
        return target_name, "", None, diagnostics

    read_csv_path = value.args[0].value
    read_csv_diagnostic = create_node_diagnostic(value.args[0], "CSV path used by `pd.read_csv(...)`.")
    if not isinstance(read_csv_path, str):
        diagnostics.append(create_node_diagnostic(value.args[0], "`pd.read_csv(...)` needs a string CSV path."))
        return target_name, "", read_csv_diagnostic, diagnostics

    if is_unsafe_runtime_read_path(read_csv_path):
        diagnostics.append(
            create_node_diagnostic(value.args[0], "That CSV path is outside the lesson runtime workspace.")
        )

    return target_name, read_csv_path, read_csv_diagnostic, diagnostics


def get_restricted_head_expression(
    node: ast.AST,
    target_name: str,
) -> tuple[int | None, list[dict[str, Any]]]:
    diagnostics: list[dict[str, Any]] = []

    if not isinstance(node, ast.Expr):
        return None, [
            create_node_diagnostic(node, "Put `df.head()` on the last line so the runtime can display output.")
        ]

    value = node.value
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
            create_node_diagnostic(keyword, "`df.head(...)` keyword arguments are not enabled yet.")
            for keyword in value.keywords
        )

    if len(value.args) > 1:
        diagnostics.extend(
            create_node_diagnostic(arg, "`df.head(...)` accepts at most one row count.")
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
            create_node_diagnostic(head_rows, "`df.head(...)` row count must be an integer from 0 to 10.")
        )
        return None, diagnostics

    if head_rows.value < 0 or head_rows.value > 10:
        diagnostics.append(
            create_node_diagnostic(head_rows, "`df.head(...)` row count must be between 0 and 10.")
        )
        return None, diagnostics

    return head_rows.value, diagnostics


def create_missing_output_diagnostic(body: list[ast.stmt], tree: ast.Module) -> dict[str, Any]:
    message = "Put `df.head()` on the last line so the runtime can display output."
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


def is_allowed_pandas_import(node: ast.Import) -> bool:
    return (
        len(node.names) == 1
        and node.names[0].name == "pandas"
        and node.names[0].asname == "pd"
    )


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
