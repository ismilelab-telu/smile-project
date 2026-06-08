from __future__ import annotations

import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from migrate_federated_progress import (
    CognitoUser,
    MigrationError,
    get_provider_subject_from_username,
    merge_progress_for_migration,
    validate_user_pair,
)


class FederatedProgressMigrationTests(unittest.TestCase):
    def test_merge_progress_uses_source_as_local_winner(self) -> None:
        destination = {
            "attempts": {
                "exercise-1": {
                    "exerciseId": "exercise-1",
                    "score": 50,
                    "status": "incorrect",
                    "submittedAt": "2026-01-01T00:00:00.000Z",
                },
                "exercise-2": {
                    "exerciseId": "exercise-2",
                    "score": 90,
                    "status": "correct",
                    "submittedAt": "2026-01-03T00:00:00.000Z",
                },
            },
            "completedLessonIds": ["lesson-1", "lesson-2"],
            "currentLessonId": "lesson-destination",
            "lessonAnswers": {
                "lesson-1": {"selectedOptionIdsByExerciseId": {"exercise-1": ["old"]}},
            },
            "submittedExerciseAnswers": {
                "exercise-1": {"selectedOptionIdsByExerciseId": {"exercise-1": ["old"]}},
                "exercise-2": {
                    "selectedOptionIdsByExerciseId": {"exercise-2": ["destination"]}
                },
            },
            "version": 1,
        }
        source = {
            "attempts": {
                "exercise-1": {
                    "exerciseId": "exercise-1",
                    "score": 100,
                    "status": "correct",
                    "submittedAt": "2026-01-02T00:00:00.000Z",
                },
                "exercise-2": {
                    "exerciseId": "exercise-2",
                    "score": 70,
                    "status": "incorrect",
                    "submittedAt": "2026-01-03T00:00:00.000Z",
                },
            },
            "completedLessonIds": ["lesson-2", "lesson-3"],
            "currentLessonId": "lesson-source",
            "lessonAnswers": {
                "lesson-1": {"selectedOptionIdsByExerciseId": {"exercise-1": ["new"]}},
            },
            "submittedExerciseAnswers": {
                "exercise-1": {"selectedOptionIdsByExerciseId": {"exercise-1": ["new"]}},
                "exercise-2": {"selectedOptionIdsByExerciseId": {"exercise-2": ["source"]}},
            },
            "version": 1,
        }

        merged = merge_progress_for_migration(destination, source)

        self.assertEqual(merged["completedLessonIds"], ["lesson-1", "lesson-2", "lesson-3"])
        self.assertEqual(merged["currentLessonId"], "lesson-source")
        self.assertEqual(
            merged["lessonAnswers"]["lesson-1"]["selectedOptionIdsByExerciseId"]["exercise-1"],
            ["new"],
        )
        self.assertEqual(merged["attempts"]["exercise-1"]["score"], 100)
        self.assertEqual(merged["attempts"]["exercise-2"]["score"], 90)
        self.assertEqual(
            merged["submittedExerciseAnswers"]["exercise-1"]["selectedOptionIdsByExerciseId"][
                "exercise-1"
            ],
            ["new"],
        )
        self.assertEqual(
            merged["submittedExerciseAnswers"]["exercise-2"]["selectedOptionIdsByExerciseId"][
                "exercise-2"
            ],
            ["destination"],
        )

    def test_provider_subject_preserves_underscores(self) -> None:
        self.assertEqual(
            get_provider_subject_from_username(
                "Google_subject_with_underscores", provider="Google"
            ),
            "subject_with_underscores",
        )

    def test_provider_subject_requires_matching_provider(self) -> None:
        with self.assertRaises(MigrationError):
            get_provider_subject_from_username("Microsoft_subject", provider="Google")

    def test_unverified_source_email_fails_by_default(self) -> None:
        destination_user = CognitoUser(
            attributes={
                "email": "student@example.com",
                "email_verified": "true",
                "sub": "destination-sub",
            },
            username="student@example.com",
        )
        source_user = CognitoUser(
            attributes={
                "email": "student@example.com",
                "email_verified": "false",
                "sub": "source-sub",
            },
            username="Google_provider-sub",
        )

        with self.assertRaises(MigrationError):
            validate_user_pair(
                allow_missing_source_email_verified=False,
                allow_unverified_source_email=False,
                destination_user=destination_user,
                email="student@example.com",
                provider="Google",
                require_source_email_verified=False,
                source_user=source_user,
            )

    def test_unverified_source_email_can_be_explicitly_allowed(self) -> None:
        destination_user = CognitoUser(
            attributes={
                "email": "student@example.com",
                "email_verified": "true",
                "sub": "destination-sub",
            },
            username="student@example.com",
        )
        source_user = CognitoUser(
            attributes={
                "email": "student@example.com",
                "email_verified": "false",
                "sub": "source-sub",
            },
            username="Google_provider-sub",
        )

        warnings = validate_user_pair(
            allow_missing_source_email_verified=False,
            allow_unverified_source_email=True,
            destination_user=destination_user,
            email="student@example.com",
            provider="Google",
            require_source_email_verified=False,
            source_user=source_user,
        )

        self.assertTrue(warnings)


if __name__ == "__main__":
    unittest.main()
