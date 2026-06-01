from __future__ import annotations

import io
import sys
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from app import (
    AuthenticationError,
    build_expected_pandas_code,
    inspect_zip_bytes,
    is_valid_learning_progress,
    require_learning_backend_user,
    run_pandas_loading_code,
    sanitize_file_name,
    validate_pandas_loading_code,
)


def create_zip(entries: dict[str, str]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name, content in entries.items():
            archive.writestr(name, content)
    return buffer.getvalue()


class LearningBackendTest(unittest.TestCase):
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
        self.assertIn("between 0 and 10", result["message"])

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


if __name__ == "__main__":
    unittest.main()
