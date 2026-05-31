from __future__ import annotations

import ast
import base64
import csv
import io
import json
import os
import re
import uuid
import zipfile
from typing import Any

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:  # pragma: no cover - Lambda and SAM builds install boto3.
    boto3 = None

    class ClientError(Exception):
        pass


UPLOAD_BUCKET = os.environ.get("UPLOAD_BUCKET", "")
MAX_ZIP_BYTES = int(os.environ.get("MAX_ZIP_BYTES", "52428800"))
MAX_UNZIPPED_BYTES = int(os.environ.get("MAX_UNZIPPED_BYTES", "104857600"))
MAX_ZIP_ENTRIES = 512
PRESIGN_EXPIRES_IN_SECONDS = 600

_s3_client = None


class ClientInputError(ValueError):
    pass


def lambda_handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path = event.get("rawPath", "/")

    if method == "OPTIONS":
        return response(204, {})

    try:
        if method == "GET" and path == "/health":
            return response(200, {"ok": True})

        if method == "POST" and path == "/uploads/presign":
            return response(200, create_presigned_upload(parse_json_body(event)))

        if method == "POST" and path == "/datasets/inspect":
            return response(200, inspect_uploaded_dataset(parse_json_body(event)))

        if method == "POST" and path == "/pandas/validate":
            return response(200, validate_uploaded_dataset_code(parse_json_body(event)))

        return response(404, {"message": "Route not found."})
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


def parse_json_body(event: dict[str, Any]) -> dict[str, Any]:
    raw_body = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raw_body = base64.b64decode(raw_body).decode("utf-8")

    if len(raw_body) > 65536:
        raise ClientInputError("Request body is too large.")

    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError as error:
        raise ClientInputError("Request body must be valid JSON.") from error

    if not isinstance(body, dict):
        raise ClientInputError("Request body must be a JSON object.")

    return body


def create_presigned_upload(body: dict[str, Any]) -> dict[str, Any]:
    file_name = get_required_string(body, "fileName")
    content_type = get_optional_string(body, "contentType") or "application/zip"
    safe_file_name = sanitize_file_name(file_name)
    object_key = f"uploads/{uuid.uuid4()}/{safe_file_name}"

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


def inspect_uploaded_dataset(body: dict[str, Any]) -> dict[str, Any]:
    object_key = require_upload_object_key(body)
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


def validate_uploaded_dataset_code(body: dict[str, Any]) -> dict[str, Any]:
    object_key = require_upload_object_key(body)
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


def require_upload_object_key(body: dict[str, Any]) -> str:
    object_key = get_required_string(body, "objectKey")
    if not object_key.startswith("uploads/"):
        raise ClientInputError("Object key is outside the upload area.")
    return object_key


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
        _s3_client = boto3.client("s3")

    return _s3_client
