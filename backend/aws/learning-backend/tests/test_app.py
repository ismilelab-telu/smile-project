from __future__ import annotations

import io
import sys
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

import app
from app import (
    AuthenticationError,
    CognitoSignInError,
    UsernameReservationError,
    build_expected_pandas_code,
    confirm_username_reservation,
    get_confirmed_email_for_username,
    inspect_zip_bytes,
    is_valid_learning_progress,
    require_learning_backend_user,
    reserve_username_for_signup,
    run_pandas_loading_code,
    sanitize_file_name,
    sign_in_with_username,
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
        username_key = kwargs["Key"]["usernameKey"]["S"]
        item = self.items.get(username_key)

        return {"Item": item} if item else {}


class FakeCognitoIdentityProviderClient:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

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


class LearningBackendTest(unittest.TestCase):
    def setUp(self) -> None:
        self.original_cognito_client_id = app.COGNITO_CLIENT_ID
        self.original_cognito_identity_provider_client = app._cognito_identity_provider_client
        self.original_dynamodb_client = app._dynamodb_client
        self.original_learning_progress_table = app.LEARNING_PROGRESS_TABLE
        self.original_decrypt_cognito_sender_code = app.decrypt_cognito_sender_code
        self.original_send_resend_email = app.send_resend_email
        self.original_username_reservation_table = app.USERNAME_RESERVATION_TABLE

    def tearDown(self) -> None:
        app.COGNITO_CLIENT_ID = self.original_cognito_client_id
        app._cognito_identity_provider_client = self.original_cognito_identity_provider_client
        app._dynamodb_client = self.original_dynamodb_client
        app.LEARNING_PROGRESS_TABLE = self.original_learning_progress_table
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

    def test_accepts_valid_guest_session_for_dataset_tools(self) -> None:
        user = require_learning_backend_user({"headers": {}}, {"guestId": "guest_12345678"})

        self.assertEqual(user["sub"], "guest/guest_12345678")
        self.assertTrue(user["isGuest"])

    def test_rejects_invalid_guest_session_for_dataset_tools(self) -> None:
        with self.assertRaises(AuthenticationError):
            require_learning_backend_user({"headers": {}}, {"guestId": "../bad"})

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

    def test_custom_email_sender_sends_decrypted_verification_code_with_resend(self) -> None:
        sent_messages: list[dict[str, str]] = []

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
