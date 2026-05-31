from __future__ import annotations

import io
import sys
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from app import (
    build_expected_pandas_code,
    inspect_zip_bytes,
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

    def test_rejects_wrong_csv_path(self) -> None:
        result = validate_pandas_loading_code(
            'import pandas as pd\n\ndf = pd.read_csv("data/wrong.csv")\ndf.head()',
            "data/food/Food_Delivery_Times.csv",
        )

        self.assertEqual(result["status"], "partial")
        self.assertIn("expected", result["message"])

    def test_sanitizes_uploaded_file_names(self) -> None:
        self.assertEqual(sanitize_file_name("../Food Delivery (final).zip"), "Food-Delivery-final-.zip")
        self.assertEqual(sanitize_file_name("dataset"), "dataset.zip")


if __name__ == "__main__":
    unittest.main()
