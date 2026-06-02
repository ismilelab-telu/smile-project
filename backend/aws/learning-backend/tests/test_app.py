from __future__ import annotations

import io
import sys
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import app
from app import (
    AuthCodeExpiredError,
    AuthCooldownError,
    AuthenticationError,
    CognitoSignInError,
    UsernameReservationError,
    build_expected_pandas_code,
    confirm_sign_up,
    confirm_username_reservation,
    get_confirmed_email_for_username,
    inspect_zip_bytes,
    is_valid_learning_progress,
    record_confirmation_code_expiry,
    require_learning_backend_user,
    reserve_confirmation_resend,
    reserve_username_for_signup,
    run_pandas_loading_code,
    sanitize_file_name,
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


class FakeDynamoDbClient:
    def __init__(self) -> None:
        self.items: dict[str, dict[str, dict[str, str]]] = {}

    def put_item(self, **kwargs):
        item = kwargs["Item"]
        if "cooldownKey" in item:
            cooldown_key = item["cooldownKey"]["S"]
            if "ConditionExpression" not in kwargs:
                self.items[cooldown_key] = item
                return {}

            existing_item = self.items.get(cooldown_key)
            now = int(kwargs["ExpressionAttributeValues"].get(":now", {"N": "0"})["N"])

            if existing_item:
                next_allowed_at = int(existing_item.get("nextAllowedAt", {"N": "0"})["N"])
                if next_allowed_at > now:
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
        username_key = kwargs["Key"]["usernameKey"]["S"]
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

    def initiate_auth(self, **kwargs):
        self.calls.append(kwargs)

        return {
            "AuthenticationResult": {
                "AccessToken": "access-token",
                "ExpiresIn": 3600,
                "IdToken": "id-token",
                "RefreshToken": "refresh-token",
            }
        }

    def resend_confirmation_code(self, **kwargs):
        self.calls.append(kwargs)

        return {}

    def confirm_sign_up(self, **kwargs):
        self.calls.append(kwargs)

        return {}


class LearningBackendTest(unittest.TestCase):
    def setUp(self) -> None:
        self.original_cognito_client_id = app.COGNITO_CLIENT_ID
        self.original_cognito_user_pool_id = app.COGNITO_USER_POOL_ID
        self.original_cognito_identity_provider_client = app._cognito_identity_provider_client
        self.original_create_confirmation_code = app.create_confirmation_code
        self.original_dynamodb_client = app._dynamodb_client
        self.original_learning_progress_table = app.LEARNING_PROGRESS_TABLE
        self.original_auth_cooldown_table = app.AUTH_COOLDOWN_TABLE
        self.original_auth_confirmation_code_ttl_seconds = app.AUTH_CONFIRMATION_CODE_TTL_SECONDS
        self.original_decrypt_cognito_sender_code = app.decrypt_cognito_sender_code
        self.original_send_resend_email = app.send_resend_email
        self.original_username_reservation_table = app.USERNAME_RESERVATION_TABLE

    def tearDown(self) -> None:
        app.COGNITO_CLIENT_ID = self.original_cognito_client_id
        app.COGNITO_USER_POOL_ID = self.original_cognito_user_pool_id
        app._cognito_identity_provider_client = self.original_cognito_identity_provider_client
        app.create_confirmation_code = self.original_create_confirmation_code
        app._dynamodb_client = self.original_dynamodb_client
        app.LEARNING_PROGRESS_TABLE = self.original_learning_progress_table
        app.AUTH_COOLDOWN_TABLE = self.original_auth_cooldown_table
        app.AUTH_CONFIRMATION_CODE_TTL_SECONDS = (
            self.original_auth_confirmation_code_ttl_seconds
        )
        app.decrypt_cognito_sender_code = self.original_decrypt_cognito_sender_code
        app.send_resend_email = self.original_send_resend_email
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

    def test_sign_in_with_username_uses_confirmed_email(self) -> None:
        app.COGNITO_CLIENT_ID = "web-client"
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

        result = sign_in_with_username({"password": "Password1", "username": "Student_One"})

        self.assertEqual(result["authenticationResult"]["AccessToken"], "access-token")
        self.assertEqual(
            fake_cognito.calls[0]["AuthParameters"],
            {"PASSWORD": "Password1", "USERNAME": "student@example.com"},
        )

    def test_sign_in_with_username_ignores_pending_reservation(self) -> None:
        app.COGNITO_CLIENT_ID = "web-client"
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
            sign_in_with_username({"password": "Password1", "username": "Student_One"})

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
                "password": "Password1",
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
                "password": "Password1",
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
                "password": "Password1",
            },
            now=100,
        )

        with self.assertRaises(AuthCodeExpiredError):
            confirm_sign_up(
                {"code": "123456", "email": "student@example.com", "password": "Password1"},
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
                "password": "Password1",
            },
            now=100,
        )

        with self.assertRaises(CognitoSignInError) as context:
            confirm_sign_up(
                {"code": "000000", "email": "student@example.com", "password": "Password1"},
                now=120,
            )

        self.assertEqual(context.exception.code, "CodeMismatchException")
        pending_item = fake_dynamodb.items[app.create_pending_signup_key("student@example.com")]
        self.assertEqual(pending_item["attempts"]["N"], "1")

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
                "password": "Password1",
            },
            now=100,
        )

        result = confirm_sign_up(
            {"code": "123456", "email": "student@example.com", "password": "Password1"},
            now=120,
        )

        self.assertTrue(result["ok"])
        self.assertIn("student@example.com", fake_cognito.users)
        self.assertEqual(fake_cognito.users["student@example.com"]["password"], "Password1")
        self.assertEqual(fake_dynamodb.items["student_one"]["status"]["S"], "confirmed")
        self.assertNotIn(app.create_pending_signup_key("student@example.com"), fake_dynamodb.items)

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
