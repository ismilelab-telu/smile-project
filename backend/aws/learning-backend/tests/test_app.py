from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import sys
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import app
from app import (
    AuthCodeExpiredError,
    AuthCooldownError,
    AuthRateLimitError,
    AuthenticationError,
    CognitoSignInError,
    UsernameReservationError,
    build_expected_pandas_code,
    confirm_password_reset,
    confirm_sign_up,
    confirm_username_reservation,
    get_confirmed_email_for_username,
    inspect_zip_bytes,
    is_valid_learning_progress,
    request_password_reset,
    record_confirmation_code_expiry,
    refresh_cognito_session,
    require_learning_backend_user,
    reserve_confirmation_resend,
    reserve_username_for_signup,
    resolve_username_sign_in_email,
    run_pandas_loading_code,
    sanitize_file_name,
    sign_in_with_email,
    sign_in_with_username,
    start_sign_up,
    validate_pandas_loading_code,
)


def create_zip(entries: dict[str, str]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name, content in entries.items():
            archive.writestr(name, content)
    return buffer.getvalue()


def create_cognito_event(email: str, username: str, trigger_source: str = "PreSignUp_SignUp"):
    return {
        "request": {
            "userAttributes": {
                "email": email,
                "name": username,
            }
        },
        "triggerSource": trigger_source,
    }


def create_client_error(code: str, message: str = ""):
    response = {"Error": {"Code": code, "Message": message}}

    try:
        error = app.ClientError(response, "TestOperation")
    except TypeError:
        error = app.ClientError()

    if not hasattr(error, "response"):
        error.response = response

    return error


def create_expected_cognito_secret_hash(
    username: str, client_id: str = "web-client", client_secret: str = "client-secret"
) -> str:
    digest = hmac.new(
        client_secret.encode("utf-8"),
        f"{username}{client_id}".encode("utf-8"),
        hashlib.sha256,
    ).digest()

    return base64.b64encode(digest).decode("utf-8")


def create_unverified_jwt(payload: dict[str, object]) -> str:
    encoded_payload = (
        base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8"))
        .decode("ascii")
        .rstrip("=")
    )

    return f"header.{encoded_payload}.signature"


class FakeDynamoDbClient:
    def __init__(self) -> None:
        self.items: dict[str, dict[str, dict[str, str]]] = {}
        self.update_calls: list[dict[str, object]] = []

    def put_item(self, **kwargs):
        item = kwargs["Item"]
        if "cooldownKey" in item:
            cooldown_key = item["cooldownKey"]["S"]
            if "ConditionExpression" not in kwargs:
                self.items[cooldown_key] = item
                return {}

            existing_item = self.items.get(cooldown_key)
            values = kwargs["ExpressionAttributeValues"]
            now = int(values.get(":now", {"N": "0"})["N"])

            if "requestCount" in item:
                max_requests = int(values.get(":maxRequests", {"N": "0"})["N"])
                if existing_item:
                    window_expires_at = int(
                        existing_item.get("windowExpiresAt", {"N": "0"})["N"]
                    )
                    request_count = int(existing_item.get("requestCount", {"N": "0"})["N"])
                    if window_expires_at > now and request_count >= max_requests:
                        raise create_client_error("ConditionalCheckFailedException")

                self.items[cooldown_key] = item
                return {}

            if existing_item:
                expires_at = int(existing_item.get("expiresAt", {"N": "0"})["N"])
                next_allowed_at = int(existing_item.get("nextAllowedAt", {"N": "0"})["N"])
                if expires_at > now and next_allowed_at > now:
                    raise create_client_error("ConditionalCheckFailedException")

            self.items[cooldown_key] = item
            return {}

        username_key = item["usernameKey"]["S"]
        existing_item = self.items.get(username_key)
        requested_email = kwargs["ExpressionAttributeValues"][":email"]["S"]
        now = int(kwargs["ExpressionAttributeValues"].get(":now", {"N": "0"})["N"])

        if existing_item and existing_item["email"]["S"] != requested_email:
            expires_at = int(existing_item.get("expiresAt", {"N": "0"})["N"])
            if expires_at and expires_at < now:
                self.items[username_key] = item
                return {}

            raise create_client_error("ConditionalCheckFailedException")

        self.items[username_key] = item
        return {}

    def update_item(self, **kwargs):
        self.update_calls.append(kwargs)
        key = kwargs["Key"]

        if "cooldownKey" in key:
            cooldown_key = key["cooldownKey"]["S"]
            item = self.items.get(cooldown_key)
            values = kwargs["ExpressionAttributeValues"]
            now = int(values[":now"]["N"])
            max_attempts = int(values[":maxAttempts"]["N"])
            allowed_statuses = {values[":pending"]["S"]}
            if ":existing" in values:
                allowed_statuses.add(values[":existing"]["S"])

            if (
                not item
                or item.get("status", {}).get("S") not in allowed_statuses
                or int(item.get("expiresAt", {"N": "0"})["N"]) <= now
                or int(item.get("attempts", {"N": "0"})["N"]) >= max_attempts
            ):
                raise create_client_error("ConditionalCheckFailedException")

            attempts = int(item.get("attempts", {"N": "0"})["N"])
            item["attempts"] = {
                "N": str(attempts + int(values[":one"]["N"])),
            }
            item["updatedAt"] = values[":now"]
            return {}

        username_key = key["usernameKey"]["S"]
        item = self.items.get(username_key)
        requested_email = kwargs["ExpressionAttributeValues"][":email"]["S"]

        if not item or item["email"]["S"] != requested_email:
            raise create_client_error("ConditionalCheckFailedException")

        item["confirmedAt"] = kwargs["ExpressionAttributeValues"][":confirmedAt"]
        item["status"] = kwargs["ExpressionAttributeValues"][":status"]
        item.pop("expiresAt", None)
        return {}

    def get_item(self, **kwargs):
        key = kwargs["Key"]
        item_key = key.get("usernameKey", key.get("cooldownKey"))["S"]
        item = self.items.get(item_key)

        return {"Item": item} if item else {}

    def delete_item(self, **kwargs):
        key = kwargs["Key"]
        item_key = key.get("usernameKey", key.get("cooldownKey"))["S"]

        if "ConditionExpression" in kwargs:
            item = self.items.get(item_key)
            values = kwargs.get("ExpressionAttributeValues", {})
            requested_email = values.get(":email", {}).get("S")
            requested_status = values.get(":status", {}).get("S")

            if (
                not item
                or item.get("email", {}).get("S") != requested_email
                or item.get("status", {}).get("S") != requested_status
            ):
                raise create_client_error("ConditionalCheckFailedException")

        self.items.pop(item_key, None)
        return {}


class FakeCognitoIdentityProviderClient:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []
        self.users: dict[str, dict[str, object]] = {}

    def admin_create_user(self, **kwargs):
        self.calls.append(kwargs)
        username = str(kwargs["Username"])

        if username in self.users:
            raise create_client_error("UsernameExistsException")

        self.users[username] = {
            "attributes": kwargs.get("UserAttributes", []),
            "password": "",
        }
        return {}

    def admin_delete_user(self, **kwargs):
        self.calls.append(kwargs)
        self.users.pop(str(kwargs["Username"]), None)
        return {}

    def admin_get_user(self, **kwargs):
        self.calls.append(kwargs)
        username = str(kwargs["Username"])

        if username not in self.users:
            raise create_client_error("UserNotFoundException")

        return {"Username": username}

    def admin_set_user_password(self, **kwargs):
        self.calls.append(kwargs)
        username = str(kwargs["Username"])

        if username not in self.users:
            raise create_client_error("UserNotFoundException")

        self.users[username]["password"] = kwargs["Password"]
        self.users[username]["permanent"] = kwargs["Permanent"]
        return {}

    def admin_initiate_auth(self, **kwargs):
        self.calls.append(kwargs)

        return {
            "AuthenticationResult": {
                "AccessToken": "access-token",
                "ExpiresIn": 3600,
                "IdToken": "id-token",
                "RefreshToken": "refresh-token",
            }
        }

    def forgot_password(self, **kwargs):
        self.calls.append(kwargs)

        return {
            "CodeDeliveryDetails": {
                "AttributeName": "email",
                "DeliveryMedium": "EMAIL",
                "Destination": "s***t@example.com",
            }
        }

    def confirm_forgot_password(self, **kwargs):
        self.calls.append(kwargs)

        return {}

    def resend_confirmation_code(self, **kwargs):
        self.calls.append(kwargs)

        return {}

    def confirm_sign_up(self, **kwargs):
        self.calls.append(kwargs)

        return {}

    def revoke_token(self, **kwargs):
        self.calls.append(kwargs)

        return {}


class FakeJwtModule:
    def __init__(self, claims: dict[str, object]) -> None:
        self.claims = claims
        self.calls: list[dict[str, object]] = []

    def decode(self, token, signing_key, algorithms, issuer, options):
        self.calls.append(
            {
                "algorithms": algorithms,
                "issuer": issuer,
                "options": options,
                "signing_key": signing_key,
                "token": token,
            }
        )

        return self.claims


class FakeJwksClient:
    def get_signing_key_from_jwt(self, token):
        return type("FakeSigningKey", (), {"key": f"key-for-{token}"})()


class LearningBackendTest(unittest.TestCase):
    def setUp(self) -> None:
        self.original_cognito_client_id = app.COGNITO_CLIENT_ID
        self.original_cognito_client_secret = app.COGNITO_CLIENT_SECRET
        self.original_cognito_region = app.COGNITO_REGION
        self.original_cognito_user_pool_id = app.COGNITO_USER_POOL_ID
        self.original_cognito_identity_provider_client = app._cognito_identity_provider_client
        self.original_create_confirmation_code = app.create_confirmation_code
        self.original_dynamodb_client = app._dynamodb_client
        self.original_jwt = app.jwt
        self.original_jwks_client = app._jwks_client
        self.original_py_jwk_client = app.PyJWKClient
        self.original_learning_progress_table = app.LEARNING_PROGRESS_TABLE
        self.original_auth_cooldown_table = app.AUTH_COOLDOWN_TABLE
        self.original_auth_confirmation_code_ttl_seconds = app.AUTH_CONFIRMATION_CODE_TTL_SECONDS
        self.original_auth_confirmation_code_pepper = app.AUTH_CONFIRMATION_CODE_PEPPER
        self.original_auth_sign_in_burst_limit = app.AUTH_SIGN_IN_BURST_LIMIT
        self.original_auth_sign_in_burst_window_seconds = (
            app.AUTH_SIGN_IN_BURST_WINDOW_SECONDS
        )
        self.original_auth_session_revoke_burst_limit = app.AUTH_SESSION_REVOKE_BURST_LIMIT
        self.original_auth_session_revoke_burst_window_seconds = (
            app.AUTH_SESSION_REVOKE_BURST_WINDOW_SECONDS
        )
        self.original_auth_refresh_session_cookie_name = app.AUTH_REFRESH_SESSION_COOKIE_NAME
        self.original_auth_refresh_session_cookie_secure = app.AUTH_REFRESH_SESSION_COOKIE_SECURE
        self.original_auth_refresh_session_cookie_max_age_seconds = (
            app.AUTH_REFRESH_SESSION_COOKIE_MAX_AGE_SECONDS
        )
        self.original_learning_backend_proxy_secret = app.LEARNING_BACKEND_PROXY_SECRET
        self.original_learning_backend_require_proxy_secret = (
            app.LEARNING_BACKEND_REQUIRE_PROXY_SECRET
        )
        self.original_decrypt_cognito_sender_code = app.decrypt_cognito_sender_code
        self.original_send_resend_email = app.send_resend_email
        self.original_auth_sign_up_min_duration_seconds = app.AUTH_SIGN_UP_MIN_DURATION_SECONDS
        self.original_auth_sign_up_timing_jitter_seconds = app.AUTH_SIGN_UP_TIMING_JITTER_SECONDS
        self.original_time_perf_counter = app.time.perf_counter
        self.original_time_sleep = app.time.sleep
        self.original_random_uniform = app.random.uniform
        self.original_username_reservation_table = app.USERNAME_RESERVATION_TABLE
        app.AUTH_SIGN_UP_MIN_DURATION_SECONDS = 0
        app.AUTH_SIGN_UP_TIMING_JITTER_SECONDS = 0
        app.AUTH_CONFIRMATION_CODE_PEPPER = "test-confirmation-code-pepper-32"
        app.AUTH_SIGN_IN_BURST_LIMIT = 8
        app.AUTH_SIGN_IN_BURST_WINDOW_SECONDS = 300
        app.AUTH_SESSION_REVOKE_BURST_LIMIT = 30
        app.AUTH_SESSION_REVOKE_BURST_WINDOW_SECONDS = 60
        app.AUTH_REFRESH_SESSION_COOKIE_NAME = "__Host-smile-refresh-session"
        app.AUTH_REFRESH_SESSION_COOKIE_SECURE = True
        app.AUTH_REFRESH_SESSION_COOKIE_MAX_AGE_SECONDS = 604800

    def tearDown(self) -> None:
        app.COGNITO_CLIENT_ID = self.original_cognito_client_id
        app.COGNITO_CLIENT_SECRET = self.original_cognito_client_secret
        app.COGNITO_REGION = self.original_cognito_region
        app.COGNITO_USER_POOL_ID = self.original_cognito_user_pool_id
        app._cognito_identity_provider_client = self.original_cognito_identity_provider_client
        app.create_confirmation_code = self.original_create_confirmation_code
        app._dynamodb_client = self.original_dynamodb_client
        app.jwt = self.original_jwt
        app._jwks_client = self.original_jwks_client
        app.PyJWKClient = self.original_py_jwk_client
        app.LEARNING_PROGRESS_TABLE = self.original_learning_progress_table
        app.AUTH_COOLDOWN_TABLE = self.original_auth_cooldown_table
        app.AUTH_CONFIRMATION_CODE_TTL_SECONDS = (
            self.original_auth_confirmation_code_ttl_seconds
        )
        app.AUTH_CONFIRMATION_CODE_PEPPER = self.original_auth_confirmation_code_pepper
        app.AUTH_SIGN_IN_BURST_LIMIT = self.original_auth_sign_in_burst_limit
        app.AUTH_SIGN_IN_BURST_WINDOW_SECONDS = (
            self.original_auth_sign_in_burst_window_seconds
        )
        app.AUTH_SESSION_REVOKE_BURST_LIMIT = self.original_auth_session_revoke_burst_limit
        app.AUTH_SESSION_REVOKE_BURST_WINDOW_SECONDS = (
            self.original_auth_session_revoke_burst_window_seconds
        )
        app.AUTH_REFRESH_SESSION_COOKIE_NAME = self.original_auth_refresh_session_cookie_name
        app.AUTH_REFRESH_SESSION_COOKIE_SECURE = self.original_auth_refresh_session_cookie_secure
        app.AUTH_REFRESH_SESSION_COOKIE_MAX_AGE_SECONDS = (
            self.original_auth_refresh_session_cookie_max_age_seconds
        )
        app.LEARNING_BACKEND_PROXY_SECRET = self.original_learning_backend_proxy_secret
        app.LEARNING_BACKEND_REQUIRE_PROXY_SECRET = (
            self.original_learning_backend_require_proxy_secret
        )
        app.decrypt_cognito_sender_code = self.original_decrypt_cognito_sender_code
        app.send_resend_email = self.original_send_resend_email
        app.AUTH_SIGN_UP_MIN_DURATION_SECONDS = self.original_auth_sign_up_min_duration_seconds
        app.AUTH_SIGN_UP_TIMING_JITTER_SECONDS = (
            self.original_auth_sign_up_timing_jitter_seconds
        )
        app.time.perf_counter = self.original_time_perf_counter
        app.time.sleep = self.original_time_sleep
        app.random.uniform = self.original_random_uniform
        app.USERNAME_RESERVATION_TABLE = self.original_username_reservation_table

    def test_inspects_first_csv_path_and_preview(self) -> None:
        archive = create_zip(
            {
                "__MACOSX/ignored.csv": "x\n1\n",
                "notes.txt": "hello",
                "food/Food_Delivery_Times.csv": "Order_ID,Time_taken\n1,42\n2,36\n",
            }
        )

        result = inspect_zip_bytes(archive)

        self.assertEqual(result["csvPath"], "food/Food_Delivery_Times.csv")
        self.assertEqual(result["columns"], ["Order_ID", "Time_taken"])
        self.assertEqual(result["previewRows"], [["1", "42"], ["2", "36"]])

    def test_validates_expected_pandas_loading_code(self) -> None:
        expected_path = "data/food/Food_Delivery_Times.csv"
        code = build_expected_pandas_code(expected_path)

        result = validate_pandas_loading_code(code, expected_path)

        self.assertEqual(result["status"], "correct")
        self.assertEqual(result["score"], 100)

    def test_runs_restricted_pandas_loading_code(self) -> None:
        expected_path = "data/Food_Delivery_Times.csv"
        result = run_pandas_loading_code(
            build_expected_pandas_code(expected_path),
            expected_path,
            b"Order_ID,Time_taken\n1,42\n2,36\n",
        )

        self.assertEqual(result["status"], "correct")
        self.assertEqual(result["columns"], ["Order_ID", "Time_taken"])
        self.assertEqual(result["previewRows"], [["1", "42"], ["2", "36"]])

    def test_allows_custom_pandas_alias_and_dataframe_name(self) -> None:
        expected_path = "data/Food_Delivery_Times.csv"
        result = run_pandas_loading_code(
            f'import pandas as pan\n\npan = pan.read_csv("{expected_path}")\npan.head()',
            expected_path,
            b"Order_ID,Time_taken\n1,42\n2,36\n",
        )

        self.assertEqual(result["status"], "correct")
        self.assertEqual(result["columns"], ["Order_ID", "Time_taken"])
        self.assertEqual(result["previewRows"], [["1", "42"], ["2", "36"]])

    def test_allows_head_row_count_up_to_ten(self) -> None:
        expected_path = "data/Food_Delivery_Times.csv"
        result = run_pandas_loading_code(
            f'import pandas as pd\n\ndata = pd.read_csv("{expected_path}")\ndata.head(2)',
            expected_path,
            b"Order_ID,Time_taken\n1,42\n2,36\n3,31\n",
        )

        self.assertEqual(result["status"], "correct")
        self.assertEqual(result["previewRows"], [["1", "42"], ["2", "36"]])

    def test_returns_name_error_for_unassigned_head_variable(self) -> None:
        expected_path = "data/Food_Delivery_Times.csv"
        result = run_pandas_loading_code(
            f'import pandas as pd\n\ndata = pd.read_csv("{expected_path}")\ndf.head()',
            expected_path,
            b"Order_ID,Time_taken\n1,42\n2,36\n",
        )

        self.assertEqual(result["status"], "partial")
        self.assertIn("Python runtime error: NameError", result["message"])
        self.assertIn("name 'df' is not defined", result["message"])
        self.assertEqual(result["diagnostics"][0]["line"], 4)

    def test_rejects_head_row_count_above_ten(self) -> None:
        expected_path = "data/Food_Delivery_Times.csv"
        result = run_pandas_loading_code(
            f'import pandas as pd\n\ndata = pd.read_csv("{expected_path}")\ndata.head(11)',
            expected_path,
            b"Order_ID,Time_taken\n1,42\n2,36\n",
        )

        self.assertEqual(result["status"], "partial")
        self.assertIn("between 1 and 10", result["message"])

    def test_rejects_zero_head_row_count(self) -> None:
        expected_path = "data/Food_Delivery_Times.csv"
        result = run_pandas_loading_code(
            f'import pandas as pd\n\ndata = pd.read_csv("{expected_path}")\ndata.head(0)',
            expected_path,
            b"Order_ID,Time_taken\n1,42\n2,36\n",
        )

        self.assertEqual(result["status"], "partial")
        self.assertIn("between 1 and 10", result["message"])

    def test_returns_pandas_runtime_errors(self) -> None:
        result = run_pandas_loading_code(
            'import pandas as pd\n\ndf = pd.read_csv("data/missing.csv")\ndf.head()',
            "data/Food_Delivery_Times.csv",
            b"Order_ID,Time_taken\n1,42\n2,36\n",
        )

        self.assertEqual(result["status"], "partial")
        self.assertIn("Python runtime error", result["message"])
        self.assertIn("FileNotFoundError", result["message"])

    def test_prioritizes_missing_csv_before_later_structural_errors(self) -> None:
        result = run_pandas_loading_code(
            'import pandas as pd\n\ndf = pd.read_csv("data/missing.csv")\ndfhead()',
            "data/Food_Delivery_Times.csv",
            b"Order_ID,Time_taken\n1,42\n2,36\n",
        )

        self.assertEqual(result["status"], "partial")
        self.assertIn("FileNotFoundError", result["message"])
        self.assertEqual(result["diagnostics"][0]["line"], 3)
        self.assertEqual(result["diagnostics"][1]["line"], 4)

    def test_prioritizes_missing_csv_before_extra_later_lines(self) -> None:
        result = run_pandas_loading_code(
            'import pandas as pd\n\ndf = pd.read_csv("data/missing.csv")\ndfhead()\ndf.head()',
            "data/Food_Delivery_Times.csv",
            b"Order_ID,Time_taken\n1,42\n2,36\n",
        )

        self.assertEqual(result["status"], "partial")
        self.assertIn("FileNotFoundError", result["message"])
        self.assertEqual(result["diagnostics"][0]["line"], 3)
        self.assertEqual(result["diagnostics"][1]["line"], 4)
        self.assertEqual(result["diagnostics"][2]["line"], 5)

    def test_missing_output_diagnostic_points_to_last_statement(self) -> None:
        result = run_pandas_loading_code(
            'import pandas as pd\n\ndf = pd.read_csv("data/Food_Delivery_Times.csv")',
            "data/Food_Delivery_Times.csv",
            b"Order_ID,Time_taken\n1,42\n2,36\n",
        )

        self.assertEqual(result["status"], "partial")
        self.assertIn("Lesson runtime error", result["message"])
        self.assertIn("Put `df.head()`", result["message"])
        self.assertEqual(result["diagnostics"][0]["line"], 3)

    def test_rejects_disallowed_python_without_executing_user_code(self) -> None:
        result = run_pandas_loading_code(
            'import pandas as pd\n\ndf = pd.read_csv("data/Food_Delivery_Times.csv")\nopen("/etc/passwd").read()',
            "data/Food_Delivery_Times.csv",
            b"Order_ID,Time_taken\n1,42\n2,36\n",
        )

        self.assertEqual(result["status"], "partial")
        self.assertIn("Lesson runtime error", result["message"])
        self.assertNotIn("PermissionError", result["message"])

    def test_returns_multiple_structural_diagnostics(self) -> None:
        result = run_pandas_loading_code(
            'import pandas as pd\n\ndf = pdread_csv("data/Food_Delivery_Times.csv")\ndfhead()',
            "data/Food_Delivery_Times.csv",
            b"Order_ID,Time_taken\n1,42\n2,36\n",
        )

        self.assertEqual(result["status"], "partial")
        self.assertEqual(len(result["diagnostics"]), 2)
        self.assertEqual(result["diagnostics"][0]["line"], 3)
        self.assertEqual(result["diagnostics"][1]["line"], 4)

    def test_rejects_wrong_csv_path(self) -> None:
        result = validate_pandas_loading_code(
            'import pandas as pd\n\ndf = pd.read_csv("data/wrong.csv")\ndf.head()',
            "data/food/Food_Delivery_Times.csv",
        )

        self.assertEqual(result["status"], "partial")
        self.assertIn("expected", result["message"])

    def test_returns_python_syntax_error_details(self) -> None:
        result = validate_pandas_loading_code(
            'import pandas as pd\n\ndf = pd.read_csv("data/food.csv"\ndf.head()',
            "data/food.csv",
        )

        self.assertEqual(result["status"], "partial")
        self.assertIn("Python runtime error: SyntaxError", result["message"])
        self.assertIn("line", result["message"])

    def test_sanitizes_uploaded_file_names(self) -> None:
        self.assertEqual(sanitize_file_name("../Food Delivery (final).zip"), "Food-Delivery-final-.zip")
        self.assertEqual(sanitize_file_name("dataset"), "dataset.zip")

    def test_validates_learning_progress_shape(self) -> None:
        self.assertTrue(
            is_valid_learning_progress(
                {
                    "attempts": {},
                    "completedLessonIds": ["lesson-1"],
                    "lessonAnswers": {},
                    "submittedExerciseAnswers": {},
                    "version": 1,
                }
            )
        )
        self.assertFalse(is_valid_learning_progress({"completedLessonIds": ["lesson-1"]}))
        self.assertFalse(
            is_valid_learning_progress({"completedLessonIds": [123], "version": 1})
        )

    def test_rejects_guest_session_for_dataset_tools(self) -> None:
        with self.assertRaises(AuthenticationError):
            require_learning_backend_user({"headers": {}}, {"guestId": "guest_12345678"})

    def test_verify_cognito_token_accepts_id_token_for_configured_client(self) -> None:
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_REGION = "ap-southeast-1"
        app.COGNITO_USER_POOL_ID = "user-pool"
        fake_jwt = FakeJwtModule(
            {
                "aud": "web-client",
                "email": "student@example.com",
                "sub": "student-1",
                "token_use": "id",
            }
        )
        app.jwt = fake_jwt
        app.PyJWKClient = object
        app._jwks_client = FakeJwksClient()

        user = app.verify_cognito_token("jwt-token")

        self.assertEqual(user, {"email": "student@example.com", "sub": "student-1"})
        self.assertEqual(fake_jwt.calls[0]["issuer"], app.get_cognito_issuer())
        self.assertEqual(fake_jwt.calls[0]["options"], {"verify_aud": False})

    def test_verify_cognito_token_rejects_wrong_audience(self) -> None:
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_REGION = "ap-southeast-1"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.jwt = FakeJwtModule(
            {
                "aud": "other-client",
                "email": "student@example.com",
                "sub": "student-1",
                "token_use": "id",
            }
        )
        app.PyJWKClient = object
        app._jwks_client = FakeJwksClient()

        with self.assertRaises(AuthenticationError):
            app.verify_cognito_token("jwt-token")

    def test_username_reservation_is_pending_until_email_confirmation(self) -> None:
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        app._dynamodb_client = fake_dynamodb
        signup_event = create_cognito_event("Student@Example.com", "Student_One")

        reserve_username_for_signup(signup_event)

        pending_item = fake_dynamodb.items["student_one"]
        self.assertEqual(pending_item["status"]["S"], "pending")
        self.assertIn("expiresAt", pending_item)
        self.assertEqual(get_confirmed_email_for_username("student_one"), "")

        confirm_username_reservation(
            create_cognito_event(
                "student@example.com",
                "Student_One",
                trigger_source="PostConfirmation_ConfirmSignUp",
            )
        )

        confirmed_item = fake_dynamodb.items["student_one"]
        self.assertEqual(confirmed_item["status"]["S"], "confirmed")
        self.assertNotIn("expiresAt", confirmed_item)
        self.assertEqual(get_confirmed_email_for_username("student_one"), "student@example.com")

    def test_rejects_duplicate_username_reservation(self) -> None:
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        app._dynamodb_client = fake_dynamodb

        reserve_username_for_signup(create_cognito_event("student@example.com", "Student_One"))

        with self.assertRaises(UsernameReservationError):
            reserve_username_for_signup(create_cognito_event("other@example.com", "student_one"))

    def test_deprecated_username_resolution_does_not_return_email(self) -> None:
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        fake_dynamodb.items["student_one"] = {
            "email": {"S": "student@example.com"},
            "status": {"S": "confirmed"},
            "username": {"S": "Student_One"},
            "usernameKey": {"S": "student_one"},
        }
        fake_cognito = FakeCognitoIdentityProviderClient()
        app._dynamodb_client = fake_dynamodb
        app._cognito_identity_provider_client = fake_cognito

        with self.assertRaises(CognitoSignInError) as context:
            resolve_username_sign_in_email({"username": "Student_One"})

        self.assertEqual(context.exception.code, "NotAuthorizedException")
        self.assertEqual(fake_cognito.calls, [])

    def test_username_sign_in_uses_confirmed_email_without_returning_it(self) -> None:
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        fake_dynamodb.items["student_one"] = {
            "email": {"S": "student@example.com"},
            "status": {"S": "confirmed"},
            "username": {"S": "Student_One"},
            "usernameKey": {"S": "student_one"},
        }
        fake_cognito = FakeCognitoIdentityProviderClient()
        app._dynamodb_client = fake_dynamodb
        app._cognito_identity_provider_client = fake_cognito

        result = sign_in_with_username({"password": "StrongPass1!", "username": "Student_One"})

        self.assertEqual(result["authenticationResult"]["IdToken"], "id-token")
        self.assertNotIn("email", result)
        self.assertEqual(fake_cognito.calls[0]["AuthFlow"], "ADMIN_USER_PASSWORD_AUTH")
        self.assertEqual(fake_cognito.calls[0]["AuthParameters"]["USERNAME"], "student@example.com")
        self.assertEqual(fake_cognito.calls[0]["AuthParameters"]["PASSWORD"], "StrongPass1!")
        self.assertEqual(
            fake_cognito.calls[0]["AuthParameters"]["SECRET_HASH"],
            create_expected_cognito_secret_hash("student@example.com"),
        )
        self.assertEqual(fake_cognito.calls[0]["ClientId"], "web-client")
        self.assertEqual(fake_cognito.calls[0]["UserPoolId"], "user-pool")

    def test_unknown_username_sign_in_uses_dummy_cognito_path(self) -> None:
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        fake_cognito = FakeCognitoIdentityProviderClient()
        app._dynamodb_client = fake_dynamodb
        app._cognito_identity_provider_client = fake_cognito

        with self.assertRaises(CognitoSignInError) as context:
            sign_in_with_username({"password": "StrongPass1!", "username": "Missing_Student"})

        self.assertEqual(context.exception.code, "NotAuthorizedException")
        self.assertEqual(len(fake_cognito.calls), 1)
        dummy_email = fake_cognito.calls[0]["AuthParameters"]["USERNAME"]
        self.assertTrue(str(dummy_email).startswith("missing-"))
        self.assertTrue(str(dummy_email).endswith("@invalid.smile-auth.local"))
        self.assertEqual(
            fake_cognito.calls[0]["AuthParameters"]["SECRET_HASH"],
            create_expected_cognito_secret_hash(str(dummy_email)),
        )

    def test_email_sign_in_returns_tokens_without_cognito_direct_from_client(self) -> None:
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        app.COGNITO_USER_POOL_ID = "user-pool"
        fake_cognito = FakeCognitoIdentityProviderClient()
        app._cognito_identity_provider_client = fake_cognito

        result = sign_in_with_email(
            {"email": "Student@Example.com", "password": "StrongPass1!"}
        )

        self.assertEqual(result["authenticationResult"]["IdToken"], "id-token")
        self.assertEqual(fake_cognito.calls[0]["AuthFlow"], "ADMIN_USER_PASSWORD_AUTH")
        self.assertEqual(fake_cognito.calls[0]["AuthParameters"]["USERNAME"], "student@example.com")
        self.assertEqual(fake_cognito.calls[0]["AuthParameters"]["PASSWORD"], "StrongPass1!")
        self.assertEqual(
            fake_cognito.calls[0]["AuthParameters"]["SECRET_HASH"],
            create_expected_cognito_secret_hash("student@example.com"),
        )
        self.assertEqual(fake_cognito.calls[0]["ClientId"], "web-client")
        self.assertEqual(fake_cognito.calls[0]["UserPoolId"], "user-pool")

    def test_email_sign_in_maps_cognito_throttle_to_auth_rate_limit(self) -> None:
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        app.COGNITO_USER_POOL_ID = "user-pool"
        fake_cognito = FakeCognitoIdentityProviderClient()
        fake_cognito.admin_initiate_auth = lambda **kwargs: (_ for _ in ()).throw(
            create_client_error("TooManyRequestsException")
        )
        app._cognito_identity_provider_client = fake_cognito

        with self.assertRaises(AuthRateLimitError) as context:
            sign_in_with_email({"email": "Student@Example.com", "password": "StrongPass1!"})

        self.assertEqual(context.exception.retry_after_seconds, 2)

    def test_email_sign_in_route_sets_refresh_cookie_without_returning_refresh_token(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        app.COGNITO_USER_POOL_ID = "user-pool"
        id_token = create_unverified_jwt(
            {
                "email": "student@example.com",
                "exp": 1_800_000_000,
                "name": "Student One",
                "sub": "student-sub",
            }
        )
        fake_cognito = FakeCognitoIdentityProviderClient()
        fake_cognito.admin_initiate_auth = lambda **kwargs: {
            "AuthenticationResult": {
                "AccessToken": "access-token",
                "ExpiresIn": 3600,
                "IdToken": id_token,
                "RefreshToken": "refresh-token",
            }
        }
        app._cognito_identity_provider_client = fake_cognito
        app._dynamodb_client = FakeDynamoDbClient()

        result = app.lambda_handler(
            {
                "body": '{"email":"student@example.com","password":"StrongPass1!"}',
                "requestContext": {"http": {"method": "POST", "sourceIp": "203.0.113.10"}},
                "rawPath": "/auth/email/sign-in",
            },
            None,
        )

        body = json.loads(result["body"])
        self.assertEqual(result["statusCode"], 200)
        self.assertNotIn("RefreshToken", body["authenticationResult"])
        self.assertEqual(body["authenticationResult"]["AccessToken"], "access-token")
        self.assertEqual(len(result["cookies"]), 1)
        self.assertIn("__Host-smile-refresh-session=", result["cookies"][0])
        self.assertIn("HttpOnly", result["cookies"][0])
        self.assertIn("Secure", result["cookies"][0])
        self.assertIn("SameSite=Lax", result["cookies"][0])

    def test_session_refresh_uses_backend_owned_admin_auth(self) -> None:
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        app.COGNITO_USER_POOL_ID = "user-pool"
        fake_cognito = FakeCognitoIdentityProviderClient()
        app._cognito_identity_provider_client = fake_cognito

        result = refresh_cognito_session(
            {
                "refreshToken": "refresh-token",
                "userSub": "student-sub",
            }
        )

        self.assertEqual(result["authenticationResult"]["IdToken"], "id-token")
        self.assertEqual(fake_cognito.calls[0]["AuthFlow"], "REFRESH_TOKEN_AUTH")
        self.assertEqual(fake_cognito.calls[0]["AuthParameters"]["REFRESH_TOKEN"], "refresh-token")
        self.assertEqual(
            fake_cognito.calls[0]["AuthParameters"]["SECRET_HASH"],
            create_expected_cognito_secret_hash("student-sub"),
        )
        self.assertEqual(fake_cognito.calls[0]["ClientId"], "web-client")
        self.assertEqual(fake_cognito.calls[0]["UserPoolId"], "user-pool")

    def test_session_bootstrap_refreshes_from_http_only_cookie(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        app.COGNITO_USER_POOL_ID = "user-pool"
        fake_cognito = FakeCognitoIdentityProviderClient()
        app._cognito_identity_provider_client = fake_cognito
        app._dynamodb_client = FakeDynamoDbClient()
        cookie_value = app.create_signed_refresh_session_value(
            {
                "refreshToken": "refresh-token",
                "userSub": "student-sub",
            }
        )

        result = app.lambda_handler(
            {
                "body": "{}",
                "headers": {
                    "cookie": f"other=value; __Host-smile-refresh-session={cookie_value}",
                },
                "requestContext": {"http": {"method": "POST", "sourceIp": "203.0.113.10"}},
                "rawPath": "/auth/session/bootstrap",
            },
            None,
        )

        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(fake_cognito.calls[0]["AuthFlow"], "REFRESH_TOKEN_AUTH")
        self.assertEqual(fake_cognito.calls[0]["AuthParameters"]["REFRESH_TOKEN"], "refresh-token")
        self.assertEqual(
            fake_cognito.calls[0]["AuthParameters"]["SECRET_HASH"],
            create_expected_cognito_secret_hash("student-sub"),
        )

    def test_session_refresh_rate_limit_uses_user_sub_identifier(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        app.COGNITO_USER_POOL_ID = "user-pool"
        fake_cognito = FakeCognitoIdentityProviderClient()
        app._cognito_identity_provider_client = fake_cognito
        app._dynamodb_client = FakeDynamoDbClient()

        first_event = {
            "body": (
                '{"refreshToken":"refresh-token","userSub":"student-sub"}'
            ),
            "requestContext": {"http": {"method": "POST", "sourceIp": "203.0.113.10"}},
            "rawPath": "/auth/session/refresh",
        }
        second_event = {
            "body": (
                '{"refreshToken":"refresh-token","userSub":"student-sub"}'
            ),
            "requestContext": {"http": {"method": "POST", "sourceIp": "203.0.113.11"}},
            "rawPath": "/auth/session/refresh",
        }

        first_result = app.lambda_handler(first_event, None)
        second_result = app.lambda_handler(second_event, None)

        self.assertEqual(first_result["statusCode"], 200)
        self.assertEqual(second_result["statusCode"], 429)
        self.assertEqual(len(fake_cognito.calls), 1)

    def test_session_revoke_is_not_public_rate_limited(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        fake_cognito = FakeCognitoIdentityProviderClient()
        app._cognito_identity_provider_client = fake_cognito
        app._dynamodb_client = FakeDynamoDbClient()

        event = {
            "body": '{"refreshToken":"refresh-token"}',
            "requestContext": {"http": {"method": "POST", "sourceIp": "203.0.113.10"}},
            "rawPath": "/auth/session/revoke",
        }

        first_result = app.lambda_handler(event, None)
        second_result = app.lambda_handler(event, None)

        self.assertEqual(first_result["statusCode"], 200)
        self.assertEqual(second_result["statusCode"], 200)
        self.assertEqual(len(fake_cognito.calls), 2)
        self.assertEqual(fake_cognito.calls[0]["Token"], "refresh-token")
        self.assertEqual(fake_cognito.calls[1]["Token"], "refresh-token")

    def test_session_revoke_uses_cookie_and_clears_refresh_cookie(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        fake_cognito = FakeCognitoIdentityProviderClient()
        app._cognito_identity_provider_client = fake_cognito
        app._dynamodb_client = FakeDynamoDbClient()
        cookie_value = app.create_signed_refresh_session_value(
            {
                "refreshToken": "refresh-token",
                "userSub": "student-sub",
            }
        )

        result = app.lambda_handler(
            {
                "body": "{}",
                "headers": {"cookie": f"__Host-smile-refresh-session={cookie_value}"},
                "requestContext": {"http": {"method": "POST", "sourceIp": "203.0.113.10"}},
                "rawPath": "/auth/session/revoke",
            },
            None,
        )

        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(fake_cognito.calls[0]["Token"], "refresh-token")
        self.assertIn("__Host-smile-refresh-session=", result["cookies"][0])
        self.assertIn("Max-Age=0", result["cookies"][0])

    def test_session_revoke_caps_excessive_source_bursts(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.AUTH_SESSION_REVOKE_BURST_LIMIT = 2
        app.AUTH_SESSION_REVOKE_BURST_WINDOW_SECONDS = 60
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        fake_cognito = FakeCognitoIdentityProviderClient()
        app._cognito_identity_provider_client = fake_cognito
        app._dynamodb_client = FakeDynamoDbClient()

        event = {
            "body": '{"refreshToken":"refresh-token"}',
            "requestContext": {"http": {"method": "POST", "sourceIp": "203.0.113.10"}},
            "rawPath": "/auth/session/revoke",
        }

        first_result = app.lambda_handler(event, None)
        second_result = app.lambda_handler(event, None)
        third_result = app.lambda_handler(event, None)

        self.assertEqual(first_result["statusCode"], 200)
        self.assertEqual(second_result["statusCode"], 200)
        self.assertEqual(third_result["statusCode"], 429)
        self.assertEqual(len(fake_cognito.calls), 2)

    def test_password_reset_request_uses_generic_delivery_for_missing_user(self) -> None:
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        fake_cognito = FakeCognitoIdentityProviderClient()
        fake_cognito.forgot_password = lambda **kwargs: (_ for _ in ()).throw(
            create_client_error("UserNotFoundException")
        )
        app._cognito_identity_provider_client = fake_cognito

        result = request_password_reset({"email": "Student@Example.com"})

        self.assertEqual(result["CodeDeliveryDetails"]["DeliveryMedium"], "EMAIL")
        self.assertEqual(result["CodeDeliveryDetails"]["Destination"], "s***t@example.com")

    def test_password_reset_request_sends_cognito_secret_hash(self) -> None:
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        fake_cognito = FakeCognitoIdentityProviderClient()
        app._cognito_identity_provider_client = fake_cognito

        result = request_password_reset({"email": "Student@Example.com"})

        self.assertEqual(result["CodeDeliveryDetails"]["DeliveryMedium"], "EMAIL")
        self.assertEqual(fake_cognito.calls[0]["ClientId"], "web-client")
        self.assertEqual(
            fake_cognito.calls[0]["SecretHash"],
            create_expected_cognito_secret_hash("student@example.com"),
        )
        self.assertEqual(fake_cognito.calls[0]["Username"], "student@example.com")

    def test_password_reset_request_maps_cognito_throttle_to_auth_rate_limit(self) -> None:
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        fake_cognito = FakeCognitoIdentityProviderClient()
        fake_cognito.forgot_password = lambda **kwargs: (_ for _ in ()).throw(
            create_client_error("LimitExceededException")
        )
        app._cognito_identity_provider_client = fake_cognito

        with self.assertRaises(AuthRateLimitError) as context:
            request_password_reset({"email": "Student@Example.com"})

        self.assertEqual(context.exception.retry_after_seconds, 30)

    def test_confirm_password_reset_calls_cognito(self) -> None:
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        fake_cognito = FakeCognitoIdentityProviderClient()
        app._cognito_identity_provider_client = fake_cognito

        result = confirm_password_reset(
            {"code": "123456", "email": "Student@Example.com", "password": "StrongPass1!"}
        )

        self.assertTrue(result["ok"])
        self.assertEqual(fake_cognito.calls[0]["ClientId"], "web-client")
        self.assertEqual(fake_cognito.calls[0]["ConfirmationCode"], "123456")
        self.assertEqual(
            fake_cognito.calls[0]["SecretHash"],
            create_expected_cognito_secret_hash("student@example.com"),
        )
        self.assertEqual(fake_cognito.calls[0]["Username"], "student@example.com")

    def test_confirm_password_reset_maps_cognito_throttle_to_auth_rate_limit(self) -> None:
        app.COGNITO_CLIENT_ID = "web-client"
        app.COGNITO_CLIENT_SECRET = "client-secret"
        fake_cognito = FakeCognitoIdentityProviderClient()
        fake_cognito.confirm_forgot_password = lambda **kwargs: (_ for _ in ()).throw(
            create_client_error("TooManyRequestsException")
        )
        app._cognito_identity_provider_client = fake_cognito

        with self.assertRaises(AuthRateLimitError) as context:
            confirm_password_reset(
                {"code": "123456", "email": "Student@Example.com", "password": "StrongPass1!"}
            )

        self.assertEqual(context.exception.retry_after_seconds, 3)

    def test_signup_password_policy_requires_length_case_number_and_symbol(self) -> None:
        weak_passwords = [
            "Short1!",
            "longpassword1!",
            "Longpassword!",
            "Longpassword1",
        ]

        for password in weak_passwords:
            with self.subTest(password=password):
                with self.assertRaises(CognitoSignInError) as context:
                    app.validate_signup_password(password)

                self.assertEqual(context.exception.code, "InvalidPasswordException")

        app.validate_signup_password("StrongPass1!")

    def test_resolve_username_sign_in_email_ignores_pending_reservation(self) -> None:
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        fake_dynamodb.items["student_one"] = {
            "email": {"S": "student@example.com"},
            "expiresAt": {"N": "9999999999"},
            "status": {"S": "pending"},
            "username": {"S": "Student_One"},
            "usernameKey": {"S": "student_one"},
        }
        app._dynamodb_client = fake_dynamodb

        with self.assertRaises(CognitoSignInError) as context:
            resolve_username_sign_in_email({"username": "Student_One"})

        self.assertEqual(context.exception.code, "NotAuthorizedException")

    def test_reserve_confirmation_resend_enforces_cooldown(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app._dynamodb_client = FakeDynamoDbClient()

        next_allowed_at = reserve_confirmation_resend("student@example.com", now=100)

        self.assertEqual(next_allowed_at, 130)

        with self.assertRaises(AuthCooldownError) as context:
            reserve_confirmation_resend("student@example.com", now=110)

        self.assertEqual(context.exception.retry_after_seconds, 20)
        self.assertEqual(context.exception.next_allowed_at, 130)
        self.assertEqual(reserve_confirmation_resend("student@example.com", now=130), 160)

    def test_start_sign_up_stores_pending_code_and_sends_email(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        app._dynamodb_client = fake_dynamodb
        app._cognito_identity_provider_client = FakeCognitoIdentityProviderClient()
        app.create_confirmation_code = lambda: "123456"
        sent_messages: list[dict[str, str]] = []
        app.send_resend_email = lambda **kwargs: sent_messages.append(kwargs)

        result = start_sign_up(
            {
                "email": "Student@Example.com",
                "name": "Student_One",
            },
            now=100,
        )

        pending_key = app.create_pending_signup_key("student@example.com")
        pending_item = fake_dynamodb.items[pending_key]
        self.assertEqual(pending_item["status"]["S"], "pending")
        self.assertEqual(pending_item["email"]["S"], "student@example.com")
        self.assertEqual(pending_item["usernameKey"]["S"], "student_one")
        self.assertEqual(pending_item["expiresAt"]["N"], "400")
        self.assertNotEqual(pending_item["codeHash"]["S"], "123456")
        self.assertEqual(result["CodeDeliveryDetails"]["Destination"], "s***t@example.com")
        self.assertFalse(result["UserConfirmed"])
        self.assertIn("123456", sent_messages[0]["text_body"])

    def test_start_sign_up_returns_generic_response_for_existing_email(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        app._dynamodb_client = fake_dynamodb
        fake_cognito = FakeCognitoIdentityProviderClient()
        fake_cognito.users["student@example.com"] = {"attributes": [], "password": ""}
        app._cognito_identity_provider_client = fake_cognito
        sent_messages: list[dict[str, str]] = []
        app.send_resend_email = lambda **kwargs: sent_messages.append(kwargs)

        result = start_sign_up(
            {
                "email": "student@example.com",
                "name": "Student_One",
            },
            now=100,
        )

        self.assertFalse(result["UserConfirmed"])
        self.assertEqual(result["CodeDeliveryDetails"]["Destination"], "s***t@example.com")
        self.assertEqual(result["nextAllowedAt"], 130)
        self.assertEqual(sent_messages, [])
        existing_item = fake_dynamodb.items[app.create_pending_signup_key("student@example.com")]
        self.assertEqual(existing_item["status"]["S"], "existing-user")
        self.assertNotIn("codeHash", existing_item)

    def test_start_sign_up_uses_same_repeat_cooldown_for_existing_email(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        app._dynamodb_client = FakeDynamoDbClient()
        fake_cognito = FakeCognitoIdentityProviderClient()
        fake_cognito.users["student@example.com"] = {"attributes": [], "password": ""}
        app._cognito_identity_provider_client = fake_cognito
        app.send_resend_email = lambda **kwargs: None

        start_sign_up(
            {
                "email": "student@example.com",
                "name": "Student_One",
            },
            now=100,
        )

        with self.assertRaises(AuthCooldownError) as context:
            start_sign_up(
                {
                    "email": "student@example.com",
                    "name": "Student_One",
                },
                now=110,
            )

        self.assertEqual(context.exception.retry_after_seconds, 20)
        self.assertEqual(context.exception.next_allowed_at, 130)

    def test_existing_email_decoy_uses_same_resend_cooldown(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        app._dynamodb_client = FakeDynamoDbClient()
        fake_cognito = FakeCognitoIdentityProviderClient()
        fake_cognito.users["student@example.com"] = {"attributes": [], "password": ""}
        app._cognito_identity_provider_client = fake_cognito
        app.send_resend_email = lambda **kwargs: None

        start_sign_up(
            {
                "email": "student@example.com",
                "name": "Student_One",
            },
            now=100,
        )

        original_time = app.time.time
        app.time.time = lambda: 110
        try:
            with self.assertRaises(AuthCooldownError) as context:
                app.resend_confirmation_code({"email": "student@example.com"})
        finally:
            app.time.time = original_time

        self.assertEqual(context.exception.retry_after_seconds, 20)
        self.assertEqual(context.exception.next_allowed_at, 130)

    def test_existing_email_decoy_confirmation_looks_like_wrong_code(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        app._dynamodb_client = fake_dynamodb
        fake_cognito = FakeCognitoIdentityProviderClient()
        fake_cognito.users["student@example.com"] = {"attributes": [], "password": ""}
        app._cognito_identity_provider_client = fake_cognito
        app.send_resend_email = lambda **kwargs: None

        start_sign_up(
            {
                "email": "student@example.com",
                "name": "Student_One",
            },
            now=100,
        )

        with self.assertRaises(CognitoSignInError) as context:
            confirm_sign_up(
                {"code": "000000", "email": "student@example.com", "password": "StrongPass1!"},
                now=120,
            )

        self.assertEqual(context.exception.code, "CodeMismatchException")
        existing_item = fake_dynamodb.items[app.create_pending_signup_key("student@example.com")]
        self.assertEqual(existing_item["attempts"]["N"], "1")

    def test_confirmation_code_hash_requires_configured_pepper(self) -> None:
        app.AUTH_CONFIRMATION_CODE_PEPPER = ""

        with self.assertRaises(app.AuthConfigurationError):
            app.hash_confirmation_code("student@example.com", "123456", "salt")

    def test_confirmation_code_hash_uses_required_hmac_pepper(self) -> None:
        app.AUTH_CONFIRMATION_CODE_PEPPER = "pepper-for-confirmation-code-hmac"

        self.assertEqual(
            app.hash_confirmation_code("student@example.com", "123456", "salt"),
            hmac.new(
                b"pepper-for-confirmation-code-hmac",
                b"salt:student@example.com:123456",
                hashlib.sha256,
            ).hexdigest(),
        )

    def test_start_sign_up_pads_success_responses_to_the_same_timing_window(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        app.AUTH_SIGN_UP_MIN_DURATION_SECONDS = 1.0
        app.AUTH_SIGN_UP_TIMING_JITTER_SECONDS = 0.4
        fake_dynamodb = FakeDynamoDbClient()
        fake_cognito = FakeCognitoIdentityProviderClient()
        fake_cognito.users["existing@example.com"] = {"attributes": [], "password": ""}
        app._dynamodb_client = fake_dynamodb
        app._cognito_identity_provider_client = fake_cognito
        app.create_confirmation_code = lambda: "123456"
        app.send_resend_email = lambda **kwargs: None
        app.random.uniform = lambda _low, _high: 0.2
        perf_counter_values = iter([10.0, 10.15, 20.0, 20.65])
        sleep_calls: list[float] = []
        app.time.perf_counter = lambda: next(perf_counter_values)
        app.time.sleep = lambda seconds: sleep_calls.append(seconds)

        start_sign_up(
            {
                "email": "existing@example.com",
                "name": "Student_One",
            },
            now=100,
        )
        start_sign_up(
            {
                "email": "new@example.com",
                "name": "Student_Two",
            },
            now=100,
        )

        self.assertEqual(len(sleep_calls), 2)
        self.assertAlmostEqual(sleep_calls[0], 1.05)
        self.assertAlmostEqual(sleep_calls[1], 0.55)

    def test_start_sign_up_maps_cognito_lookup_throttle_to_auth_rate_limit(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        app._dynamodb_client = FakeDynamoDbClient()
        fake_cognito = FakeCognitoIdentityProviderClient()
        fake_cognito.admin_get_user = lambda **kwargs: (_ for _ in ()).throw(
            create_client_error("TooManyRequestsException")
        )
        app._cognito_identity_provider_client = fake_cognito

        with self.assertRaises(AuthRateLimitError) as context:
            start_sign_up(
                {
                    "email": "student@example.com",
                    "name": "Student_One",
                },
                now=100,
            )

        self.assertEqual(context.exception.retry_after_seconds, 5)

    def test_public_auth_rate_limit_enforces_source_and_identifier(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app._dynamodb_client = FakeDynamoDbClient()
        event = {"requestContext": {"http": {"sourceIp": "203.0.113.10"}}}

        app.enforce_public_auth_rate_limit(
            event,
            "username-sign-in",
            "Student_One",
            cooldown_seconds=5,
            now=100,
        )

        with self.assertRaises(AuthRateLimitError) as context:
            app.enforce_public_auth_rate_limit(
                event,
                "username-sign-in",
                "Student_One",
                cooldown_seconds=5,
                now=101,
            )

        self.assertEqual(context.exception.retry_after_seconds, 4)
        self.assertEqual(context.exception.next_allowed_at, 105)

    def test_public_auth_burst_limit_enforces_identifier_window(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app._dynamodb_client = FakeDynamoDbClient()

        app.enforce_public_auth_burst_limit(
            {"requestContext": {"http": {"sourceIp": "203.0.113.10"}}},
            "email-sign-in",
            "student@example.com",
            max_requests=2,
            window_seconds=60,
            now=100,
        )
        app.enforce_public_auth_burst_limit(
            {"requestContext": {"http": {"sourceIp": "203.0.113.11"}}},
            "email-sign-in",
            "student@example.com",
            max_requests=2,
            window_seconds=60,
            now=101,
        )

        with self.assertRaises(AuthRateLimitError) as context:
            app.enforce_public_auth_burst_limit(
                {"requestContext": {"http": {"sourceIp": "203.0.113.12"}}},
                "email-sign-in",
                "student@example.com",
                max_requests=2,
                window_seconds=60,
                now=102,
            )

        self.assertEqual(context.exception.retry_after_seconds, 58)
        self.assertEqual(context.exception.next_allowed_at, 160)

    def test_request_source_prefers_forwarded_cloudflare_ip_with_proxy_secret(self) -> None:
        app.LEARNING_BACKEND_PROXY_SECRET = "proxy-secret"
        event = {
            "headers": {
                "cf-connecting-ip": "198.51.100.20",
                "x-smile-learning-backend-proxy-secret": "proxy-secret",
                "x-forwarded-for": "198.51.100.21",
            },
            "requestContext": {"http": {"sourceIp": "203.0.113.10"}},
        }

        self.assertEqual(app.get_request_source(event), "198.51.100.20")

    def test_request_source_ignores_forwarded_ip_without_proxy_secret(self) -> None:
        app.LEARNING_BACKEND_PROXY_SECRET = "proxy-secret"
        event = {
            "headers": {
                "cf-connecting-ip": "198.51.100.20",
                "x-smile-learning-backend-proxy-secret": "wrong-secret",
                "x-forwarded-for": "198.51.100.21",
            },
            "requestContext": {"http": {"sourceIp": "203.0.113.10"}},
        }

        self.assertEqual(app.get_request_source(event), "203.0.113.10")

    def test_request_source_ignores_spoofable_forwarded_headers_with_proxy_secret(
        self,
    ) -> None:
        app.LEARNING_BACKEND_PROXY_SECRET = "proxy-secret"
        event = {
            "headers": {
                "x-smile-learning-backend-proxy-secret": "proxy-secret",
                "x-forwarded-for": "198.51.100.21",
                "x-real-ip": "198.51.100.22",
            },
            "requestContext": {"http": {"sourceIp": "203.0.113.10"}},
        }

        self.assertEqual(app.get_request_source(event), "203.0.113.10")

    def test_lambda_requires_proxy_secret_for_non_health_routes_when_enabled(self) -> None:
        app.LEARNING_BACKEND_REQUIRE_PROXY_SECRET = True
        app.LEARNING_BACKEND_PROXY_SECRET = "proxy-secret"
        event = {
            "body": '{"username":"Student_One"}',
            "headers": {},
            "requestContext": {"http": {"method": "POST", "sourceIp": "203.0.113.10"}},
            "rawPath": "/auth/username/resolve",
        }

        result = app.lambda_handler(event, None)

        self.assertEqual(result["statusCode"], 403)
        self.assertEqual(
            result["body"],
            '{"message": "Learning backend proxy is required."}',
        )

    def test_lambda_requires_proxy_secret_for_non_health_options_when_enabled(self) -> None:
        app.LEARNING_BACKEND_REQUIRE_PROXY_SECRET = True
        app.LEARNING_BACKEND_PROXY_SECRET = "proxy-secret"
        event = {
            "headers": {},
            "requestContext": {"http": {"method": "OPTIONS", "sourceIp": "203.0.113.10"}},
            "rawPath": "/auth/email/sign-in",
        }

        result = app.lambda_handler(event, None)

        self.assertEqual(result["statusCode"], 403)
        self.assertEqual(
            result["body"],
            '{"message": "Learning backend proxy is required."}',
        )

    def test_lambda_allows_health_without_proxy_secret_when_proxy_required(self) -> None:
        app.LEARNING_BACKEND_REQUIRE_PROXY_SECRET = True
        app.LEARNING_BACKEND_PROXY_SECRET = "proxy-secret"
        event = {
            "headers": {},
            "requestContext": {"http": {"method": "GET", "sourceIp": "203.0.113.10"}},
            "rawPath": "/health",
        }

        result = app.lambda_handler(event, None)

        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(result["body"], '{"ok": true}')

    def test_lambda_allows_trusted_proxy_options_when_proxy_secret_required(self) -> None:
        app.LEARNING_BACKEND_REQUIRE_PROXY_SECRET = True
        app.LEARNING_BACKEND_PROXY_SECRET = "proxy-secret"
        event = {
            "headers": {"x-smile-learning-backend-proxy-secret": "proxy-secret"},
            "requestContext": {"http": {"method": "OPTIONS", "sourceIp": "203.0.113.10"}},
            "rawPath": "/auth/email/sign-in",
        }

        result = app.lambda_handler(event, None)

        self.assertEqual(result["statusCode"], 204)
        self.assertEqual(result["body"], "{}")

    def test_lambda_allows_trusted_proxy_when_proxy_secret_required(self) -> None:
        app.LEARNING_BACKEND_REQUIRE_PROXY_SECRET = True
        app.LEARNING_BACKEND_PROXY_SECRET = "proxy-secret"
        event = {
            "body": '{"username":"Student_One"}',
            "headers": {"x-smile-learning-backend-proxy-secret": "proxy-secret"},
            "requestContext": {"http": {"method": "POST", "sourceIp": "203.0.113.10"}},
            "rawPath": "/auth/username/resolve",
        }

        result = app.lambda_handler(event, None)

        self.assertEqual(result["statusCode"], 400)
        self.assertIn("NotAuthorizedException", result["body"])

    def test_start_sign_up_enforces_pending_cooldown_before_reserving_username(
        self,
    ) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        app._dynamodb_client = fake_dynamodb
        app._cognito_identity_provider_client = FakeCognitoIdentityProviderClient()
        app.create_confirmation_code = lambda: "123456"
        sent_messages: list[dict[str, str]] = []
        app.send_resend_email = lambda **kwargs: sent_messages.append(kwargs)

        start_sign_up(
            {
                "email": "student@example.com",
                "name": "Student_One",
            },
            now=100,
        )

        with self.assertRaises(AuthCooldownError) as context:
            start_sign_up(
                {
                    "email": "student@example.com",
                    "name": "Student_Two",
                },
                now=110,
            )

        self.assertEqual(context.exception.retry_after_seconds, 20)
        self.assertEqual(len(sent_messages), 1)
        self.assertIn("student_one", fake_dynamodb.items)
        self.assertNotIn("student_two", fake_dynamodb.items)

    def test_start_sign_up_after_cooldown_reuses_active_pending_username(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        app._dynamodb_client = fake_dynamodb
        app._cognito_identity_provider_client = FakeCognitoIdentityProviderClient()
        codes = iter(["111111", "222222"])
        app.create_confirmation_code = lambda: next(codes)
        sent_messages: list[dict[str, str]] = []
        app.send_resend_email = lambda **kwargs: sent_messages.append(kwargs)

        start_sign_up(
            {
                "email": "student@example.com",
                "name": "Student_One",
            },
            now=100,
        )
        result = start_sign_up(
            {
                "email": "student@example.com",
                "name": "Student_Two",
            },
            now=130,
        )

        pending_item = fake_dynamodb.items[app.create_pending_signup_key("student@example.com")]
        self.assertEqual(result["nextAllowedAt"], 160)
        self.assertEqual(pending_item["usernameKey"]["S"], "student_one")
        self.assertEqual(pending_item["username"]["S"], "Student_One")
        self.assertNotIn("student_two", fake_dynamodb.items)
        self.assertIn("222222", sent_messages[-1]["text_body"])

    def test_resend_confirmation_uses_pending_signup_and_enforces_cooldown(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        app._dynamodb_client = FakeDynamoDbClient()
        app._cognito_identity_provider_client = FakeCognitoIdentityProviderClient()
        sent_messages: list[dict[str, str]] = []
        app.send_resend_email = lambda **kwargs: sent_messages.append(kwargs)
        app.create_confirmation_code = lambda: "111111"
        start_sign_up(
            {
                "email": "student@example.com",
                "name": "Student_One",
            },
            now=100,
        )

        original_time = app.time.time
        app.time.time = lambda: 110
        try:
            with self.assertRaises(AuthCooldownError) as context:
                app.resend_confirmation_code({"email": "student@example.com"})
        finally:
            app.time.time = original_time

        self.assertGreaterEqual(context.exception.retry_after_seconds, 1)

        app.time.time = lambda: 130
        app.create_confirmation_code = lambda: "222222"
        try:
            result = app.resend_confirmation_code({"email": "student@example.com"})
        finally:
            app.time.time = original_time

        self.assertEqual(result["nextAllowedAt"], 160)
        self.assertIn("222222", sent_messages[-1]["text_body"])

    def test_confirm_sign_up_rejects_code_after_custom_expiry(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.AUTH_CONFIRMATION_CODE_TTL_SECONDS = 300
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        app._dynamodb_client = FakeDynamoDbClient()
        app._cognito_identity_provider_client = FakeCognitoIdentityProviderClient()
        app.create_confirmation_code = lambda: "123456"
        app.send_resend_email = lambda **kwargs: None

        start_sign_up(
            {
                "email": "student@example.com",
                "name": "Student_One",
            },
            now=100,
        )

        with self.assertRaises(AuthCodeExpiredError):
            confirm_sign_up(
                {"code": "123456", "email": "student@example.com", "password": "StrongPass1!"},
                now=401,
            )

    def test_confirm_sign_up_rejects_wrong_code_and_counts_attempt(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        app._dynamodb_client = fake_dynamodb
        app._cognito_identity_provider_client = FakeCognitoIdentityProviderClient()
        app.create_confirmation_code = lambda: "123456"
        app.send_resend_email = lambda **kwargs: None
        start_sign_up(
            {
                "email": "student@example.com",
                "name": "Student_One",
            },
            now=100,
        )

        with self.assertRaises(CognitoSignInError) as context:
            confirm_sign_up(
                {"code": "000000", "email": "student@example.com", "password": "StrongPass1!"},
                now=120,
            )

        self.assertEqual(context.exception.code, "CodeMismatchException")
        pending_item = fake_dynamodb.items[app.create_pending_signup_key("student@example.com")]
        self.assertEqual(pending_item["attempts"]["N"], "1")
        self.assertEqual(
            fake_dynamodb.update_calls[-1]["Key"],
            {"cooldownKey": {"S": app.create_pending_signup_key("student@example.com")}},
        )
        self.assertIn("ADD attempts", str(fake_dynamodb.update_calls[-1]["UpdateExpression"]))

    def test_pending_signup_attempts_increment_from_current_item(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        app._dynamodb_client = fake_dynamodb
        app._cognito_identity_provider_client = FakeCognitoIdentityProviderClient()
        app.create_confirmation_code = lambda: "123456"
        app.send_resend_email = lambda **kwargs: None
        start_sign_up(
            {
                "email": "student@example.com",
                "name": "Student_One",
            },
            now=100,
        )

        app.increment_pending_signup_attempts("student@example.com", now=120)
        app.increment_pending_signup_attempts("student@example.com", now=121)

        pending_item = fake_dynamodb.items[app.create_pending_signup_key("student@example.com")]
        self.assertEqual(pending_item["attempts"]["N"], "2")
        self.assertEqual(len(fake_dynamodb.update_calls), 2)

    def test_confirm_sign_up_creates_confirmed_cognito_user(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        fake_cognito = FakeCognitoIdentityProviderClient()
        app._dynamodb_client = fake_dynamodb
        app._cognito_identity_provider_client = fake_cognito
        app.create_confirmation_code = lambda: "123456"
        app.send_resend_email = lambda **kwargs: None
        start_sign_up(
            {
                "email": "student@example.com",
                "name": "Student_One",
            },
            now=100,
        )

        result = confirm_sign_up(
            {"code": "123456", "email": "student@example.com", "password": "StrongPass1!"},
            now=120,
        )

        self.assertTrue(result["ok"])
        self.assertIn("student@example.com", fake_cognito.users)
        self.assertEqual(fake_cognito.users["student@example.com"]["password"], "StrongPass1!")
        self.assertEqual(fake_dynamodb.items["student_one"]["status"]["S"], "confirmed")
        self.assertNotIn(app.create_pending_signup_key("student@example.com"), fake_dynamodb.items)

    def test_confirm_sign_up_maps_cognito_admin_throttle_to_auth_rate_limit(self) -> None:
        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.COGNITO_USER_POOL_ID = "user-pool"
        app.USERNAME_RESERVATION_TABLE = "username-reservations"
        fake_dynamodb = FakeDynamoDbClient()
        fake_cognito = FakeCognitoIdentityProviderClient()
        app._dynamodb_client = fake_dynamodb
        app._cognito_identity_provider_client = fake_cognito
        app.create_confirmation_code = lambda: "123456"
        app.send_resend_email = lambda **kwargs: None
        start_sign_up(
            {
                "email": "student@example.com",
                "name": "Student_One",
            },
            now=100,
        )
        fake_cognito.admin_create_user = lambda **kwargs: (_ for _ in ()).throw(
            create_client_error("TooManyRequestsException")
        )

        with self.assertRaises(AuthRateLimitError) as context:
            confirm_sign_up(
                {"code": "123456", "email": "student@example.com", "password": "StrongPass1!"},
                now=120,
            )

        self.assertEqual(context.exception.retry_after_seconds, 3)

    def test_custom_email_sender_sends_decrypted_verification_code_with_resend(self) -> None:
        sent_messages: list[dict[str, str]] = []

        app.AUTH_COOLDOWN_TABLE = "auth-cooldowns"
        app.AUTH_CONFIRMATION_CODE_TTL_SECONDS = 300
        fake_dynamodb = FakeDynamoDbClient()
        app._dynamodb_client = fake_dynamodb
        app.decrypt_cognito_sender_code = lambda encrypted_code: f"code-{encrypted_code}"

        def fake_send_resend_email(**kwargs):
            sent_messages.append(kwargs)

        app.send_resend_email = fake_send_resend_email
        event = {
            "request": {
                "code": "encrypted",
                "userAttributes": {"email": "student@example.com"},
            },
            "triggerSource": "CustomEmailSender_SignUp",
        }

        result = app.handle_cognito_trigger(event)

        self.assertIs(result, event)
        self.assertEqual(sent_messages[0]["recipient"], "student@example.com")
        self.assertIn("Kode verifikasi", sent_messages[0]["subject"])
        self.assertIn("code-encrypted", sent_messages[0]["text_body"])
        self.assertIn("spam atau junk", sent_messages[0]["text_body"])
        expiry_key = app.create_auth_cooldown_key(
            "confirmation-code-expiry", "student@example.com"
        )
        self.assertIn(expiry_key, fake_dynamodb.items)

    def test_extracts_resend_api_key_from_plain_or_json_secret(self) -> None:
        self.assertEqual(app.extract_resend_api_key_from_secret("re_plain"), "re_plain")
        self.assertEqual(
            app.extract_resend_api_key_from_secret("Resend API key: re_embedded"),
            "re_embedded",
        )
        self.assertEqual(
            app.extract_resend_api_key_from_secret('{"apiKey":"re_json"}'),
            "re_json",
        )


if __name__ == "__main__":
    unittest.main()
