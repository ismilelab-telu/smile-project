import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { autoUpdate, flip, offset, shift, size, useFloating } from "@floating-ui/react-dom";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  InformationCircleIcon,
  LightBulbIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getDatasetView } from "../datasets/registry";
import { lessonMdxContentByLocaleAndId } from "../content/lesson-mdx-content";
import { localizeDatasetView, localizeLesson } from "../content/localized-learning-content";
import {
  evaluateMultipleChoice,
  evaluateOrderedSteps,
} from "../evaluation/evaluate-lesson-exercises";
import {
  evaluateFeatureTargetRoles,
  getExpectedColumnRoles,
} from "../evaluation/evaluate-feature-target";
import type {
  ColumnRole,
  DatasetColumn,
  DatasetRow,
  EvaluationResult,
  Lesson,
  LessonAnswer,
  LessonExercise,
  MultipleChoiceExercise,
  OrderedStepsExercise,
  TableColumnRoleExercise,
} from "../types";
import { LearningGridCanvas, LearningSheetExtensions } from "./LearningGridCanvas";
import { LearningHeader } from "./LearningHeader";
import { LiquidButton, LiquidLink } from "@/components/ui/liquid-button";
import { useLocalization, type Locale } from "@/features/localization/localization";
import { shouldReduceMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

const liquidButtonBaseClassName =
  "inline-flex items-center justify-center gap-3 rounded-none px-5 py-3 text-base font-semibold text-neutral-950 backdrop-blur-xl hover:text-neutral-50 [--liquid-button-background-color:var(--color-neutral-200)] [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-3.5 [@media_(min-width:2200px)]:text-lg";
const emeraldLiquidButtonClassName = `${liquidButtonBaseClassName} [--liquid-button-color:var(--color-emerald-500)]`;
const amberLiquidButtonClassName = `${liquidButtonBaseClassName} [--liquid-button-color:var(--color-amber-500)]`;

type LessonPageProps = {
  backHref?: string;
  backLabel?: string;
  initialAnswer?: LessonAnswer;
  initialSubmittedAnswersByExerciseId?: Record<string, LessonAnswer>;
  isCompleted?: boolean;
  lesson: Lesson;
  nextLessonHref?: string;
  onAnswerChange?: (input: { answer: LessonAnswer; lessonId: string }) => void;
  onExerciseSubmitResult?: (input: {
    answer: LessonAnswer;
    exerciseId: string;
    lessonId: string;
    result: EvaluationResult;
  }) => void;
  onSubmitResult: (result: EvaluationResult, answer: LessonAnswer) => void;
  previousLessonHref?: string;
};

const roleOptions: ColumnRole[] = ["ignore", "target", "safe-feature", "metadata"];
const roleDropdownPanelVariants = {
  closed: {
    transition: {
      staggerChildren: 0.035,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
  open: {
    transition: {
      delayChildren: 0.02,
      staggerChildren: 0.045,
      when: "beforeChildren",
    },
  },
};
type RoleDropdownHighlightRect = {
  height: number;
  y: number;
};

function getRoleOptionLabel(value: ColumnRole, t: ReturnType<typeof useLocalization>["t"]) {
  const labels: Record<ColumnRole, string> = {
    ignore: t("learning.role.ignore"),
    metadata: t("learning.role.metadata"),
    "safe-feature": t("learning.role.safeFeature"),
    target: t("learning.role.target"),
  };

  return labels[value] ?? labels.ignore;
}

function createCombinedExerciseResult(
  results: EvaluationResult[],
  locale: Locale,
): EvaluationResult {
  if (results.length === 1) {
    return results[0];
  }

  const score = Math.round(
    results.reduce((totalScore, result) => totalScore + result.score, 0) / results.length,
  );
  const missedColumnIds = [...new Set(results.flatMap((result) => result.missedColumnIds))];
  const extraColumnIds = [...new Set(results.flatMap((result) => result.extraColumnIds))];
  const correctCount = results.filter((result) => result.status === "correct").length;

  if (correctCount === results.length) {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        locale === "en"
          ? "All exercises in this lesson are correct."
          : "Semua latihan di lesson ini sudah benar.",
      nextStep:
        locale === "en"
          ? "This lesson is complete. Continue to the next unlocked lesson."
          : "Lesson ini selesai. Lanjutkan ke lesson berikutnya yang sudah terbuka.",
      score,
      status: "correct",
      title: locale === "en" ? "Correct" : "Benar",
    };
  }

  if (correctCount > 0 || results.some((result) => result.status === "partial")) {
    return {
      extraColumnIds,
      missedColumnIds,
      message:
        locale === "en"
          ? `${correctCount}/${results.length} exercises are correct. Check the remaining exercises before continuing.`
          : `${correctCount}/${results.length} latihan sudah benar. Periksa latihan yang tersisa sebelum lanjut.`,
      nextStep:
        locale === "en"
          ? "Use the feedback and hints, fix the unfinished answers, then submit again."
          : "Gunakan feedback dan petunjuk, perbaiki jawaban yang belum selesai, lalu kirim ulang.",
      score,
      status: "partial",
      title: locale === "en" ? "Partially correct" : "Sebagian benar",
    };
  }

  return {
    extraColumnIds,
    missedColumnIds,
    message:
      locale === "en"
        ? "The exercise answer does not match the main concept checked in this lesson yet."
        : "Jawaban latihan belum sesuai dengan konsep utama yang dicek di lesson ini.",
    nextStep:
      locale === "en"
        ? "Use the hints, review the material, then try again."
        : "Gunakan petunjuk, baca ulang materi, lalu coba lagi.",
    score,
    status: "incorrect",
    title: locale === "en" ? "Not quite" : "Belum tepat",
  };
}

function createRestoredCorrectResult(locale: Locale): EvaluationResult {
  return {
    extraColumnIds: [],
    message: "",
    missedColumnIds: [],
    nextStep: "",
    score: 100,
    status: "correct",
    title: locale === "en" ? "Correct" : "Benar",
  };
}

function haveSameOrderedValues(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function haveSameValueSet(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const rightValues = new Set(right);

  return left.every((value) => rightValues.has(value));
}

function createLessonAnswerSnapshot({
  assignments,
  exercises,
  orderedStepIdsByExerciseId,
  selectedOptionIdsByExerciseId,
}: {
  assignments: Record<string, ColumnRole>;
  exercises: LessonExercise[];
  orderedStepIdsByExerciseId: Record<string, string[]>;
  selectedOptionIdsByExerciseId: Record<string, string[]>;
}): LessonAnswer {
  const answer: LessonAnswer = {
    columnRoleAssignmentsByExerciseId: {},
    orderedStepIdsByExerciseId: {},
    selectedOptionIdsByExerciseId: {},
  };

  for (const exercise of exercises) {
    if (exercise.type === "multiple-choice") {
      answer.selectedOptionIdsByExerciseId[exercise.id] = [
        ...(selectedOptionIdsByExerciseId[exercise.id] ?? []),
      ];
    }

    if (exercise.type === "ordered-steps") {
      answer.orderedStepIdsByExerciseId[exercise.id] = [
        ...(orderedStepIdsByExerciseId[exercise.id] ?? []),
      ];
    }

    if (exercise.type === "table-column-role-assignment") {
      answer.columnRoleAssignmentsByExerciseId[exercise.id] = { ...assignments };
    }
  }

  return answer;
}

function evaluateExerciseAnswerSnapshot(
  exercise: LessonExercise,
  answer: LessonAnswer,
  locale: Locale,
) {
  if (exercise.type === "multiple-choice") {
    return evaluateMultipleChoice(
      exercise,
      answer.selectedOptionIdsByExerciseId?.[exercise.id] ?? [],
      locale,
    );
  }

  if (exercise.type === "ordered-steps") {
    return evaluateOrderedSteps(
      exercise,
      answer.orderedStepIdsByExerciseId?.[exercise.id] ?? [],
      locale,
    );
  }

  return evaluateFeatureTargetRoles(
    answer.columnRoleAssignmentsByExerciseId?.[exercise.id] ?? {},
    locale,
  );
}

export function LessonPage({
  backHref = "/learn",
  backLabel = "Kembali ke Beranda Belajar",
  initialAnswer,
  initialSubmittedAnswersByExerciseId = {},
  isCompleted = false,
  lesson,
  nextLessonHref,
  onAnswerChange,
  onExerciseSubmitResult,
  onSubmitResult,
  previousLessonHref,
}: LessonPageProps) {
  const { locale, t } = useLocalization();
  const localizedLesson = useMemo(() => localizeLesson(lesson, locale), [lesson, locale]);
  const exerciseEntries = useMemo(
    () => localizedLesson.exercises ?? [localizedLesson.exercise],
    [localizedLesson],
  );
  const tableColumnRoleExercise = useMemo(
    () =>
      exerciseEntries.find(
        (exercise): exercise is TableColumnRoleExercise =>
          exercise.type === "table-column-role-assignment",
      ),
    [exerciseEntries],
  );
  const expectedRoles = useMemo(() => getExpectedColumnRoles(), []);
  const baseInitialAssignments = useMemo(
    () =>
      Object.keys(expectedRoles).reduce<Record<string, ColumnRole>>((assignments, columnId) => {
        assignments[columnId] = "ignore";
        return assignments;
      }, {}),
    [expectedRoles],
  );
  const initialAssignments = useMemo(() => {
    const savedAssignments = tableColumnRoleExercise
      ? initialAnswer?.columnRoleAssignmentsByExerciseId?.[tableColumnRoleExercise.id]
      : undefined;

    return {
      ...baseInitialAssignments,
      ...savedAssignments,
    };
  }, [baseInitialAssignments, initialAnswer, tableColumnRoleExercise]);
  const initialOrderedStepIds = useMemo(
    () =>
      exerciseEntries.reduce<Record<string, string[]>>((stepIds, exercise) => {
        if (exercise.type === "ordered-steps") {
          stepIds[exercise.id] =
            initialAnswer?.orderedStepIdsByExerciseId?.[exercise.id] ??
            exercise.steps.map((step) => step.id);
        }

        return stepIds;
      }, {}),
    [exerciseEntries, initialAnswer],
  );
  const initialSelectedOptionIdsByExerciseId = useMemo(
    () =>
      exerciseEntries.reduce<Record<string, string[]>>((selectedOptionIds, exercise) => {
        if (exercise.type === "multiple-choice") {
          selectedOptionIds[exercise.id] = [
            ...(initialAnswer?.selectedOptionIdsByExerciseId?.[exercise.id] ?? []),
          ];
        }

        return selectedOptionIds;
      }, {}),
    [exerciseEntries, initialAnswer],
  );
  const initialSubmittedAnswerSnapshotsByExerciseId = useMemo(
    () =>
      exerciseEntries.reduce<Record<string, LessonAnswer>>((submittedAnswers, exercise) => {
        const submittedAnswer = initialSubmittedAnswersByExerciseId[exercise.id];

        if (submittedAnswer) {
          submittedAnswers[exercise.id] = submittedAnswer;
        }

        return submittedAnswers;
      }, {}),
    [exerciseEntries, initialSubmittedAnswersByExerciseId],
  );
  const initialExerciseResultsById = useMemo(
    () =>
      isCompleted
        ? exerciseEntries.reduce<Record<string, EvaluationResult>>((results, exercise) => {
            results[exercise.id] = createRestoredCorrectResult(locale);
            return results;
          }, {})
        : exerciseEntries.reduce<Record<string, EvaluationResult>>((results, exercise) => {
            const submittedAnswer = initialSubmittedAnswerSnapshotsByExerciseId[exercise.id];

            if (submittedAnswer) {
              results[exercise.id] = evaluateExerciseAnswerSnapshot(
                exercise,
                submittedAnswer,
                locale,
              );
            }

            return results;
          }, {}),
    [exerciseEntries, initialSubmittedAnswerSnapshotsByExerciseId, isCompleted, locale],
  );
  const mountedLessonIdRef = useRef(lesson.id);
  const [assignments, setAssignments] = useState<Record<string, ColumnRole>>(initialAssignments);
  const [orderedStepIdsByExerciseId, setOrderedStepIdsByExerciseId] =
    useState<Record<string, string[]>>(initialOrderedStepIds);
  const [exerciseResultsById, setExerciseResultsById] = useState<Record<string, EvaluationResult>>(
    initialExerciseResultsById,
  );
  const [submittedAnswerSnapshotsByExerciseId, setSubmittedAnswerSnapshotsByExerciseId] = useState<
    Record<string, LessonAnswer>
  >(initialSubmittedAnswerSnapshotsByExerciseId);
  const [selectedOptionIdsByExerciseId, setSelectedOptionIdsByExerciseId] = useState<
    Record<string, string[]>
  >(initialSelectedOptionIdsByExerciseId);
  const [visibleHintCountByExerciseId, setVisibleHintCountByExerciseId] = useState<
    Record<string, number>
  >({});
  const answerSnapshot = useMemo(
    () =>
      createLessonAnswerSnapshot({
        assignments,
        exercises: exerciseEntries,
        orderedStepIdsByExerciseId,
        selectedOptionIdsByExerciseId,
      }),
    [assignments, exerciseEntries, orderedStepIdsByExerciseId, selectedOptionIdsByExerciseId],
  );
  const datasetView =
    tableColumnRoleExercise && localizedLesson.datasetId && localizedLesson.viewId
      ? localizeDatasetView(
          getDatasetView(localizedLesson.datasetId, localizedLesson.viewId),
          locale,
        )
      : undefined;
  const LessonMdxContent = lessonMdxContentByLocaleAndId[locale][lesson.id];
  const isMultiExerciseLesson = exerciseEntries.length > 1;
  const hasAnswerForExercise = (exercise: LessonExercise) => {
    if (exercise.type === "multiple-choice") {
      return (selectedOptionIdsByExerciseId[exercise.id]?.length ?? 0) > 0;
    }

    if (exercise.type === "table-column-role-assignment") {
      return Object.values(assignments).some((role) => role !== "ignore");
    }

    const currentStepIds = orderedStepIdsByExerciseId[exercise.id] ?? [];
    const initialStepIds = initialOrderedStepIds[exercise.id] ?? [];

    return currentStepIds.some((stepId, index) => stepId !== initialStepIds[index]);
  };
  const isCurrentAnswerSubmittedForExercise = (
    exercise: LessonExercise,
    submittedAnswer: LessonAnswer | undefined,
  ) => {
    if (!submittedAnswer) {
      return false;
    }

    if (exercise.type === "multiple-choice") {
      return haveSameValueSet(
        selectedOptionIdsByExerciseId[exercise.id] ?? [],
        submittedAnswer.selectedOptionIdsByExerciseId?.[exercise.id] ?? [],
      );
    }

    if (exercise.type === "ordered-steps") {
      return haveSameOrderedValues(
        orderedStepIdsByExerciseId[exercise.id] ?? [],
        submittedAnswer.orderedStepIdsByExerciseId?.[exercise.id] ?? [],
      );
    }

    const submittedAssignments =
      submittedAnswer.columnRoleAssignmentsByExerciseId?.[exercise.id] ?? {};
    const assignmentKeys = new Set([
      ...Object.keys(assignments),
      ...Object.keys(submittedAssignments),
    ]);

    return [...assignmentKeys].every(
      (columnId) =>
        (assignments[columnId] ?? "ignore") === (submittedAssignments[columnId] ?? "ignore"),
    );
  };
  const hasAnyAnswer = exerciseEntries.some(hasAnswerForExercise);
  const areAllExerciseResultsCorrect =
    exerciseEntries.length > 0 &&
    exerciseEntries.every((exercise) => {
      const exerciseResult = exerciseResultsById[exercise.id];

      return (
        exerciseResult?.status === "correct" &&
        (isCompleted ||
          isCurrentAnswerSubmittedForExercise(
            exercise,
            submittedAnswerSnapshotsByExerciseId[exercise.id],
          ))
      );
    });
  const lessonResult =
    exerciseEntries.length === 1
      ? (exerciseResultsById[exerciseEntries[0]?.id ?? ""] ?? null)
      : areAllExerciseResultsCorrect
        ? createCombinedExerciseResult(
            exerciseEntries.map(
              (exercise) => exerciseResultsById[exercise.id] ?? createRestoredCorrectResult(locale),
            ),
            locale,
          )
        : null;
  const isLessonFinished = isCompleted || lessonResult?.status === "correct";
  const hasNotQuiteResult = exerciseEntries.some((exercise) => {
    const exerciseResult = exerciseResultsById[exercise.id];

    return exerciseResult !== undefined && exerciseResult.status !== "correct";
  });
  const isReviewMode = isLessonFinished;
  const isSubmitDisabled = !hasAnyAnswer;
  const rightEdgeCompensationClassName = hasNotQuiteResult ? "-mr-px" : "";
  const finishedActionHref = nextLessonHref ?? backHref;
  const finishedActionLabel = nextLessonHref
    ? t("navigation.continue")
    : t("navigation.back.track");

  useEffect(() => {
    if (mountedLessonIdRef.current === lesson.id) {
      return;
    }

    mountedLessonIdRef.current = lesson.id;
    setAssignments(initialAssignments);
    setOrderedStepIdsByExerciseId(initialOrderedStepIds);
    setExerciseResultsById(initialExerciseResultsById);
    setSubmittedAnswerSnapshotsByExerciseId(initialSubmittedAnswerSnapshotsByExerciseId);
    setSelectedOptionIdsByExerciseId(initialSelectedOptionIdsByExerciseId);
    setVisibleHintCountByExerciseId({});
  }, [
    initialAssignments,
    initialExerciseResultsById,
    initialOrderedStepIds,
    initialSelectedOptionIdsByExerciseId,
    initialSubmittedAnswerSnapshotsByExerciseId,
    lesson.id,
  ]);

  useEffect(() => {
    if (isCompleted) {
      return;
    }

    onAnswerChange?.({
      answer: answerSnapshot,
      lessonId: lesson.id,
    });
  }, [answerSnapshot, isCompleted, lesson.id, onAnswerChange]);

  if (tableColumnRoleExercise && !datasetView) {
    return (
      <LearningGridCanvas>
        <LearningHeader backHref={backHref} backLabel={backLabel} />
        <section className="learning-sheet route-content-transition-target mx-auto mt-20 grid max-w-xl text-center [@media_(min-width:2200px)]:max-w-3xl">
          <LearningSheetExtensions />

          <div className="learning-sheet-cell p-6 [@media_(min-width:2200px)]:p-12">
            <h1 className="text-2xl font-semibold text-foreground [@media_(min-width:2200px)]:text-4xl">
              {t("lesson.openError.title")}
            </h1>
          </div>
          <div className="learning-sheet-cell p-6 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
            {t("lesson.openError.body")}
          </div>
          <div className="learning-sheet-cell p-6 [@media_(min-width:2200px)]:p-12">
            <LiquidLink
              className={`${emeraldLiquidButtonClassName} [@media_(min-width:2200px)]:min-h-16`}
              data-app-link
              href={backHref}
            >
              {backLabel}
            </LiquidLink>
          </div>
        </section>
      </LearningGridCanvas>
    );
  }

  const updateAssignment = (columnId: string, role: ColumnRole) => {
    setAssignments((current) => ({
      ...current,
      [columnId]: role,
    }));
    if (tableColumnRoleExercise) {
      setVisibleHintCountByExerciseId((current) => ({
        ...current,
        [tableColumnRoleExercise.id]: 0,
      }));
    }
  };

  const toggleOption = (exerciseId: string, optionId: string) => {
    const exercise = exerciseEntries.find((entry) => entry.id === exerciseId);

    setSelectedOptionIdsByExerciseId((current) => {
      const currentExerciseOptionIds = current[exerciseId] ?? [];
      const isSingleOptionExercise =
        exercise?.type === "multiple-choice" && exercise.correctOptionIds.length === 1;
      const optionLimit =
        exercise?.type === "multiple-choice" ? exercise.correctOptionIds.length : 0;
      const nextExerciseOptionIds = isSingleOptionExercise
        ? [optionId]
        : currentExerciseOptionIds.includes(optionId)
          ? currentExerciseOptionIds.filter((selectedOptionId) => selectedOptionId !== optionId)
          : [...currentExerciseOptionIds, optionId].slice(-optionLimit);

      return {
        ...current,
        [exerciseId]: nextExerciseOptionIds,
      };
    });
    setVisibleHintCountByExerciseId((current) => ({
      ...current,
      [exerciseId]: 0,
    }));
  };

  const moveStep = (exerciseId: string, index: number, direction: -1 | 1) => {
    setOrderedStepIdsByExerciseId((current) => {
      const currentStepIds = current[exerciseId] ?? [];
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= currentStepIds.length) {
        return current;
      }

      const next = [...currentStepIds];
      const [stepId] = next.splice(index, 1);
      next.splice(nextIndex, 0, stepId);

      return {
        ...current,
        [exerciseId]: next,
      };
    });
    setVisibleHintCountByExerciseId((current) => ({
      ...current,
      [exerciseId]: 0,
    }));
  };

  const evaluateExercise = (exercise: LessonExercise) => {
    if (exercise.type === "multiple-choice") {
      return evaluateMultipleChoice(
        exercise,
        selectedOptionIdsByExerciseId[exercise.id] ?? [],
        locale,
      );
    }

    if (exercise.type === "ordered-steps") {
      return evaluateOrderedSteps(exercise, orderedStepIdsByExerciseId[exercise.id] ?? [], locale);
    }

    return evaluateFeatureTargetRoles(assignments, locale);
  };

  const isLessonCorrectWithResults = (
    resultsById: Record<string, EvaluationResult>,
    submittedAnswersByExerciseId: Record<string, LessonAnswer>,
  ) =>
    exerciseEntries.every((exercise) => {
      const exerciseResult = resultsById[exercise.id];

      return (
        exerciseResult?.status === "correct" &&
        isCurrentAnswerSubmittedForExercise(exercise, submittedAnswersByExerciseId[exercise.id])
      );
    });

  const submitExercise = (exercise: LessonExercise) => {
    const evaluation = evaluateExercise(exercise);
    const nextExerciseResultsById = {
      ...exerciseResultsById,
      [exercise.id]: evaluation,
    };
    const nextSubmittedAnswerSnapshotsByExerciseId = {
      ...submittedAnswerSnapshotsByExerciseId,
      [exercise.id]: answerSnapshot,
    };

    setExerciseResultsById(nextExerciseResultsById);
    setSubmittedAnswerSnapshotsByExerciseId(nextSubmittedAnswerSnapshotsByExerciseId);
    onExerciseSubmitResult?.({
      answer: answerSnapshot,
      exerciseId: exercise.id,
      lessonId: lesson.id,
      result: evaluation,
    });

    const nextLessonResult =
      exerciseEntries.length === 1
        ? evaluation
        : isLessonCorrectWithResults(
              nextExerciseResultsById,
              nextSubmittedAnswerSnapshotsByExerciseId,
            )
          ? createCombinedExerciseResult(
              exerciseEntries.map(
                (exerciseEntry) =>
                  nextExerciseResultsById[exerciseEntry.id] ?? createRestoredCorrectResult(locale),
              ),
              locale,
            )
          : null;

    if (nextLessonResult) {
      onSubmitResult(nextLessonResult, answerSnapshot);
    }

    setVisibleHintCountByExerciseId((current) => ({
      ...current,
      [exercise.id]: 0,
    }));
  };

  const toggleHints = (exerciseId: string, hintCount: number) => {
    setVisibleHintCountByExerciseId((current) => {
      const currentHintCount = current[exerciseId] ?? 0;

      return {
        ...current,
        [exerciseId]: currentHintCount >= hintCount ? 0 : Math.min(currentHintCount + 1, hintCount),
      };
    });
  };

  return (
    <LearningGridCanvas>
      <LearningHeader backHref={backHref} backLabel={backLabel} />

      <section className="learning-sheet route-content-transition-target mx-auto grid w-[min(1440px,calc(100%_-_48px))] grid-cols-1 [@media_(min-width:1024px)]:grid-cols-12 [@media_(min-width:2200px)]:w-[min(1776px,calc(100%_-_96px))]">
        <LearningSheetExtensions />

        <div
          className={`learning-sheet-cell learning-extend-left learning-extend-right col-span-full ${rightEdgeCompensationClassName} px-6 py-5 [@media_(min-width:2200px)]:px-12 [@media_(min-width:2200px)]:py-8`}
        >
          <div className="flex flex-wrap items-center gap-3 text-base text-muted-foreground [@media_(min-width:2200px)]:text-lg">
            <span>{localizedLesson.numberLabel}</span>
          </div>
        </div>
        <div
          className={`learning-sheet-cell learning-extend-left learning-extend-right col-span-full ${rightEdgeCompensationClassName} p-6 [@media_(min-width:2200px)]:p-12`}
        >
          <h1 className="max-w-none text-5xl leading-tight font-semibold tracking-normal text-foreground [@media_(min-width:2200px)]:text-8xl">
            {localizedLesson.title}
          </h1>
        </div>

        <section
          className={`learning-sheet-cell learning-extend-left learning-extend-right col-span-full ${rightEdgeCompensationClassName} p-6 [@media_(min-width:2200px)]:p-12`}
        >
          <div className="grid gap-4 text-base leading-6 text-muted-foreground [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-7 [&>*:first-child]:mt-0 [&_blockquote]:border-l-2 [&_blockquote]:border-sky-400 [&_blockquote]:pl-4 [&_blockquote]:font-medium [&_blockquote]:text-foreground [&_blockquote_p]:m-0 [&_code]:bg-neutral-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:font-semibold [&_code]:text-foreground [&_h2]:mt-3 [&_h2]:text-xl [&_h2]:leading-tight [&_h2]:font-semibold [&_h2]:text-foreground [@media_(min-width:2200px)]:[&_h2]:text-3xl [&_h3]:mt-2 [&_h3]:text-lg [&_h3]:leading-tight [&_h3]:font-semibold [&_h3]:text-foreground [@media_(min-width:2200px)]:[&_h3]:text-2xl [&_li]:pl-1 [&_ol]:grid [&_ol]:list-decimal [&_ol]:gap-2 [&_ol]:pl-6 [&_p]:m-0 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:pl-6">
            {LessonMdxContent ? (
              <LessonMdxContent />
            ) : (
              localizedLesson.summary.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
            )}
          </div>
        </section>

        {exerciseEntries.map((exercise, exerciseIndex) => {
          const exerciseLabel =
            exerciseEntries.length === 1
              ? t("learning.exercise")
              : t("learning.exercise.numbered", { number: exerciseIndex + 1 });
          const exerciseResult = exerciseResultsById[exercise.id] ?? null;
          const isExerciseCorrect = exerciseResult?.status === "correct";
          const isExerciseReadOnly = isReviewMode || isExerciseCorrect;

          return (
            <Fragment key={exercise.id}>
              {isMultiExerciseLesson && exerciseIndex > 0 ? (
                <div
                  aria-hidden="true"
                  className={`learning-sheet-cell learning-sheet-break-stripes learning-extend-left learning-extend-right col-span-full ${rightEdgeCompensationClassName} h-12 [@media_(min-width:2200px)]:h-16`}
                />
              ) : null}
              <ExerciseSection
                assignments={assignments}
                datasetView={datasetView}
                edgeCompensationClassName={rightEdgeCompensationClassName}
                exercise={exercise}
                exerciseLabel={exerciseLabel}
                onMoveStep={(index, direction) => moveStep(exercise.id, index, direction)}
                onToggleOption={(optionId) => toggleOption(exercise.id, optionId)}
                onUpdateAssignment={updateAssignment}
                orderedStepIds={orderedStepIdsByExerciseId[exercise.id] ?? []}
                result={exerciseResult}
                isReviewMode={isExerciseReadOnly}
                submittedSelectedOptionIds={
                  submittedAnswerSnapshotsByExerciseId[exercise.id]
                    ?.selectedOptionIdsByExerciseId?.[exercise.id] ?? []
                }
                selectedOptionIds={selectedOptionIdsByExerciseId[exercise.id] ?? []}
              />
              {isMultiExerciseLesson && !isLessonFinished ? (
                <ExerciseSubmitAction
                  disabled={!hasAnswerForExercise(exercise) || isExerciseCorrect}
                  edgeCompensationClassName={rightEdgeCompensationClassName}
                  onSubmit={() => submitExercise(exercise)}
                  previousLessonHref={
                    exerciseIndex === exerciseEntries.length - 1 ? previousLessonHref : undefined
                  }
                  submitted={isExerciseCorrect}
                />
              ) : null}
              {isMultiExerciseLesson && exerciseResult && exerciseResult.status !== "correct" ? (
                <>
                  <LessonResult result={exerciseResult} />
                  <LessonHintPanel
                    hints={exercise.hints}
                    onToggleHints={() => toggleHints(exercise.id, exercise.hints.length)}
                    visibleHintCount={visibleHintCountByExerciseId[exercise.id] ?? 0}
                  />
                </>
              ) : null}
            </Fragment>
          );
        })}

        {!isMultiExerciseLesson || isLessonFinished ? (
          <div
            className={`learning-sheet-cell learning-extend-left learning-extend-right col-span-full ${rightEdgeCompensationClassName} flex items-center gap-4 p-6 [@media_(min-width:2200px)]:gap-6 [@media_(min-width:2200px)]:p-12`}
          >
            {previousLessonHref ? (
              <LiquidLink
                className={`${emeraldLiquidButtonClassName} min-h-12 [@media_(min-width:2200px)]:min-h-16`}
                data-app-link
                href={previousLessonHref}
              >
                <ArrowLeftIcon
                  aria-hidden="true"
                  className="size-5 [@media_(min-width:2200px)]:size-6"
                />
                {t("navigation.prev")}
              </LiquidLink>
            ) : null}
            {isLessonFinished ? (
              <LiquidLink
                className={`${emeraldLiquidButtonClassName} ml-auto min-h-12 [@media_(min-width:2200px)]:min-h-16`}
                data-app-link
                href={finishedActionHref}
              >
                {finishedActionLabel}
                <ArrowRightIcon
                  aria-hidden="true"
                  className="size-5 [@media_(min-width:2200px)]:size-6"
                />
              </LiquidLink>
            ) : (
              <LiquidButton
                className={`${emeraldLiquidButtonClassName} ml-auto min-h-12 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-neutral-950 ${isSubmitDisabled ? "" : "cursor-pointer"} [@media_(min-width:2200px)]:min-h-16`}
                disabled={isSubmitDisabled}
                onClick={() => {
                  const firstExercise = exerciseEntries[0];

                  if (firstExercise) {
                    submitExercise(firstExercise);
                  }
                }}
                type="button"
              >
                {t("learning.submit")}
              </LiquidButton>
            )}
          </div>
        ) : null}

        {!isMultiExerciseLesson && lessonResult && lessonResult.status !== "correct" ? (
          <>
            <LessonResult result={lessonResult} />
            {hasNotQuiteResult ? (
              <LessonHintPanel
                hints={exerciseEntries[0]?.hints ?? []}
                onToggleHints={() =>
                  exerciseEntries[0]
                    ? toggleHints(exerciseEntries[0].id, exerciseEntries[0].hints.length)
                    : undefined
                }
                visibleHintCount={
                  exerciseEntries[0]
                    ? (visibleHintCountByExerciseId[exerciseEntries[0].id] ?? 0)
                    : 0
                }
              />
            ) : null}
          </>
        ) : null}

        {hasNotQuiteResult ? (
          <>
            <div
              aria-hidden="true"
              className="learning-sheet-cell learning-extend-left learning-sheet-footer-cell col-span-full [@media_(min-width:1024px)]:col-span-8"
            />
            <div
              aria-hidden="true"
              className="learning-sheet-cell learning-extend-right learning-sheet-footer-cell col-span-full -mr-px [@media_(min-width:1024px)]:col-span-4"
            />
          </>
        ) : (
          <div
            aria-hidden="true"
            className="learning-sheet-cell learning-extend-left learning-extend-right learning-sheet-footer-cell col-span-full"
          />
        )}
      </section>
    </LearningGridCanvas>
  );
}

function ExerciseSubmitAction({
  disabled,
  edgeCompensationClassName,
  onSubmit,
  previousLessonHref,
  submitted,
}: {
  disabled: boolean;
  edgeCompensationClassName: string;
  onSubmit: () => void;
  previousLessonHref?: string;
  submitted: boolean;
}) {
  const { t } = useLocalization();

  return (
    <div
      className={`learning-sheet-cell learning-extend-left learning-extend-right col-span-full ${edgeCompensationClassName} flex items-center gap-4 p-6 [@media_(min-width:2200px)]:gap-6 [@media_(min-width:2200px)]:p-12`}
    >
      {previousLessonHref ? (
        <LiquidLink
          className={`${emeraldLiquidButtonClassName} min-h-12 [@media_(min-width:2200px)]:min-h-16`}
          data-app-link
          href={previousLessonHref}
        >
          <ArrowLeftIcon aria-hidden="true" className="size-5 [@media_(min-width:2200px)]:size-6" />
          {t("navigation.prev")}
        </LiquidLink>
      ) : null}
      <LiquidButton
        className={`${emeraldLiquidButtonClassName} ml-auto min-h-12 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-neutral-950 ${disabled ? "" : "cursor-pointer"} [@media_(min-width:2200px)]:min-h-16`}
        disabled={disabled}
        onClick={onSubmit}
        type="button"
      >
        {submitted ? t("learning.submitted") : t("learning.submit")}
      </LiquidButton>
    </div>
  );
}

function ExerciseSection({
  assignments,
  datasetView,
  edgeCompensationClassName,
  exercise,
  exerciseLabel,
  onMoveStep,
  onToggleOption,
  onUpdateAssignment,
  orderedStepIds,
  result,
  isReviewMode,
  submittedSelectedOptionIds,
  selectedOptionIds,
}: {
  assignments: Record<string, ColumnRole>;
  datasetView: ReturnType<typeof getDatasetView>;
  edgeCompensationClassName: string;
  exercise: LessonExercise;
  exerciseLabel: string;
  onMoveStep: (index: number, direction: -1 | 1) => void;
  onToggleOption: (optionId: string) => void;
  onUpdateAssignment: (columnId: string, role: ColumnRole) => void;
  orderedStepIds: string[];
  result: EvaluationResult | null;
  isReviewMode: boolean;
  submittedSelectedOptionIds: string[];
  selectedOptionIds: string[];
}) {
  const { t } = useLocalization();
  const choiceModeLabel =
    exercise.type === "multiple-choice"
      ? exercise.correctOptionIds.length === 1
        ? t("learning.choice.single")
        : t("learning.choice.multiple", { count: exercise.correctOptionIds.length })
      : null;

  return (
    <>
      <div
        className={`learning-sheet-cell learning-extend-left learning-extend-right col-span-full ${edgeCompensationClassName} p-6 [@media_(min-width:2200px)]:p-12`}
      >
        <p className="text-base font-medium text-sky-600 [@media_(min-width:2200px)]:text-lg">
          {exerciseLabel}
        </p>
        <h2 className="mt-3 text-xl font-semibold text-foreground [@media_(min-width:2200px)]:mt-4 [@media_(min-width:2200px)]:text-3xl">
          {exercise.prompt}
        </h2>
        {choiceModeLabel ? (
          <p className="mt-3 text-sm font-medium text-muted-foreground [@media_(min-width:2200px)]:text-base">
            {choiceModeLabel}
          </p>
        ) : null}
      </div>

      {exercise.type === "table-column-role-assignment" && datasetView ? (
        <DatasetPreview
          edgeCompensationClassName={edgeCompensationClassName}
          exercise={exercise}
          datasetView={datasetView}
        />
      ) : null}

      {exercise.type === "multiple-choice" ? (
        <MultipleChoiceExerciseView
          edgeCompensationClassName={edgeCompensationClassName}
          exercise={exercise}
          isReviewMode={isReviewMode}
          result={result}
          submittedSelectedOptionIds={submittedSelectedOptionIds}
          selectedOptionIds={selectedOptionIds}
          onToggleOption={onToggleOption}
        />
      ) : null}

      {exercise.type === "ordered-steps" ? (
        <OrderedStepsExerciseView
          edgeCompensationClassName={edgeCompensationClassName}
          exercise={exercise}
          isReviewMode={isReviewMode}
          orderedStepIds={orderedStepIds}
          onMoveStep={onMoveStep}
        />
      ) : null}

      {exercise.type === "table-column-role-assignment" && datasetView ? (
        <ColumnRoleExerciseView
          assignments={assignments}
          columns={datasetView.columns}
          edgeCompensationClassName={edgeCompensationClassName}
          exercise={exercise}
          isReviewMode={isReviewMode}
          onUpdateAssignment={onUpdateAssignment}
        />
      ) : null}
    </>
  );
}

function formatDatasetCellValue(value: DatasetRow["values"][string]) {
  return value === null ? "" : String(value);
}

function compareDatasetCellValues(
  valueA: DatasetRow["values"][string],
  valueB: DatasetRow["values"][string],
  columnType: DatasetColumn["type"],
) {
  if (valueA === valueB) {
    return 0;
  }

  if (valueA === null) {
    return -1;
  }

  if (valueB === null) {
    return 1;
  }

  if (columnType === "numeric") {
    return Number(valueA) - Number(valueB);
  }

  if (columnType === "boolean") {
    return Number(valueA) - Number(valueB);
  }

  return String(valueA).localeCompare(String(valueB), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function DatasetPreview({
  datasetView,
  edgeCompensationClassName,
  exercise,
}: {
  datasetView: NonNullable<ReturnType<typeof getDatasetView>>;
  edgeCompensationClassName: string;
  exercise: TableColumnRoleExercise;
}) {
  const { t } = useLocalization();
  const [sorting, setSorting] = useState<SortingState>([]);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const previousRowRectsRef = useRef<Map<string, DOMRectReadOnly>>(new Map());
  const tableColumns = useMemo<ColumnDef<DatasetRow>[]>(
    () =>
      datasetView.columns.map((datasetColumn) => ({
        accessorFn: (row) => row.values[datasetColumn.id],
        cell: ({ getValue }) => formatDatasetCellValue(getValue<DatasetRow["values"][string]>()),
        header: () => (
          <span className="flex min-w-0 flex-col gap-1.5 [@media_(min-width:2200px)]:gap-2">
            <span>{datasetColumn.label}</span>
            {datasetColumn.unit ? (
              <span className="text-sm font-normal text-muted-foreground [@media_(min-width:2200px)]:text-base">
                {datasetColumn.unit}
              </span>
            ) : null}
          </span>
        ),
        id: datasetColumn.id,
        meta: {
          label: datasetColumn.label,
        },
        sortingFn: (rowA, rowB, columnId) =>
          compareDatasetCellValues(
            rowA.getValue<DatasetRow["values"][string]>(columnId),
            rowB.getValue<DatasetRow["values"][string]>(columnId),
            datasetColumn.type,
          ),
      })),
    [datasetView.columns],
  );
  const table = useReactTable({
    columns: tableColumns,
    data: datasetView.rows,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    sortDescFirst: false,
    state: {
      sorting,
    },
  });
  const sortedRows = table.getRowModel().rows;
  const sortedRowOrderKey = sortedRows.map((row) => row.id).join("|");

  useGSAP(
    () => {
      const tableBody = tableBodyRef.current;

      if (!tableBody) {
        return;
      }

      const rows = gsap.utils.toArray<HTMLElement>("[data-dataset-row-id]", tableBody);
      const nextRowRects = new Map<string, DOMRectReadOnly>();
      const animatedRows: HTMLElement[] = [];

      rows.forEach((rowElement) => {
        const rowId = rowElement.dataset.datasetRowId;

        if (!rowId) {
          return;
        }

        const nextRect = rowElement.getBoundingClientRect();
        const previousRect = previousRowRectsRef.current.get(rowId);
        nextRowRects.set(rowId, nextRect);

        if (!previousRect) {
          return;
        }

        const offsetY = previousRect.top - nextRect.top;

        if (Math.abs(offsetY) < 0.5) {
          return;
        }

        gsap.set(rowElement, { y: offsetY });
        animatedRows.push(rowElement);
      });

      previousRowRectsRef.current = nextRowRects;

      if (animatedRows.length === 0 || shouldReduceMotion()) {
        gsap.set(animatedRows, { clearProps: "transform" });
        return;
      }

      gsap.to(animatedRows, {
        clearProps: "transform",
        duration: 0.48,
        ease: "power3.out",
        overwrite: true,
        stagger: {
          each: 0.012,
          from: "start",
        },
        y: 0,
      });
    },
    { dependencies: [sortedRowOrderKey], revertOnUpdate: true, scope: tableBodyRef },
  );

  return (
    <>
      <section
        className={`learning-sheet-cell learning-extend-left learning-extend-right col-span-full ${edgeCompensationClassName} flex flex-col gap-3 p-6 [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:p-12`}
      >
        <h2
          className="text-xl font-semibold text-foreground [@media_(min-width:2200px)]:text-3xl"
          id="dataset-preview"
        >
          {t("learning.dataset.preview")}
        </h2>
        <p className="text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
          {exercise.datasetContext}
        </p>
      </section>
      <div
        className={`learning-sheet-cell learning-extend-left learning-extend-right col-span-full ${edgeCompensationClassName}`}
      >
        <div className="overflow-x-auto overflow-y-clip">
          <table className="min-w-full border-separate border-spacing-0 text-left text-base [@media_(min-width:2200px)]:text-lg">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr className="learning-sheet-cell-fill-strong" key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const columnMeta = header.column.columnDef.meta as
                      | { label?: string }
                      | undefined;
                    const sortLabel = columnMeta?.label ?? String(header.column.columnDef.id);

                    return (
                      <th
                        aria-sort={
                          sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"
                        }
                        className="border-b learning-grid-border p-0 font-semibold text-foreground"
                        key={header.id}
                        scope="col"
                      >
                        <button
                          aria-label={t("learning.sortBy", { label: sortLabel })}
                          className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-400 [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-5"
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                          <span
                            aria-hidden="true"
                            className="ml-auto inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground [@media_(min-width:2200px)]:size-6"
                          >
                            {sorted === "asc" ? (
                              <ArrowUpIcon className="size-5 text-emerald-500 [@media_(min-width:2200px)]:size-6" />
                            ) : sorted === "desc" ? (
                              <ArrowDownIcon className="size-5 text-emerald-500 [@media_(min-width:2200px)]:size-6" />
                            ) : (
                              <ChevronDownIcon className="size-5 opacity-45 [@media_(min-width:2200px)]:size-6" />
                            )}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody ref={tableBodyRef}>
              {sortedRows.map((row, rowIndex) => (
                <tr
                  className={
                    rowIndex % 2 === 0
                      ? "bg-transparent will-change-transform"
                      : "learning-sheet-cell-fill will-change-transform"
                  }
                  data-dataset-row-id={row.id}
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      className={`${rowIndex === sortedRows.length - 1 ? "" : "border-b"} learning-grid-border px-5 py-4 text-muted-foreground [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-5`}
                      key={cell.id}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function RoleDropdown({
  columnLabel,
  disabled = false,
  onChange,
  value,
}: {
  columnLabel: string;
  disabled?: boolean;
  onChange: (role: ColumnRole) => void;
  value: ColumnRole;
}) {
  const { t } = useLocalization();
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef(new Map<ColumnRole, HTMLDivElement>());
  const closeTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activeOptionValue, setActiveOptionValue] = useState<ColumnRole | null>(null);
  const [highlightRect, setHighlightRect] = useState<RoleDropdownHighlightRect | null>(null);
  const [isHighlightVisible, setIsHighlightVisible] = useState(false);
  const selectedLabel = getRoleOptionLabel(value, t);
  const highlightedOptionValue = activeOptionValue ?? value;
  const reduceDropdownMotion = shouldReduceMotion();
  const { floatingStyles, refs, update } = useFloating({
    middleware: [
      offset(10),
      flip({ padding: 16 }),
      shift({ padding: 16 }),
      size({
        apply({ availableHeight, elements, rects }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(96, availableHeight)}px`,
            width: `${rects.reference.width}px`,
          });
        },
        padding: 16,
      }),
    ],
    open: isOpen,
    placement: "bottom-start",
    strategy: "fixed",
    transform: false,
    whileElementsMounted: autoUpdate,
  });

  const closeDropdown = useCallback(() => {
    setActiveOptionValue(null);
    setIsClosing(true);

    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    if (reduceDropdownMotion) {
      setIsHighlightVisible(false);
      setIsOpen(false);
      setIsClosing(false);
      return;
    }

    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      closeTimeoutRef.current = null;
    }, 330);
  }, [reduceDropdownMotion]);

  const openDropdown = () => {
    if (disabled) {
      return;
    }

    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setIsClosing(false);
    setIsOpen(true);
  };

  const toggleDropdown = () => {
    if (disabled) {
      return;
    }

    if (isOpen) {
      closeDropdown();
      return;
    }

    openDropdown();
  };

  const selectRole = (nextValue: ColumnRole) => {
    onChange(nextValue);
    closeDropdown();
  };

  const syncHighlightToOption = useCallback((nextValue: ColumnRole) => {
    const optionElement = optionRefs.current.get(nextValue);

    if (!optionElement) {
      return;
    }

    setHighlightRect({
      height: Math.max(0, optionElement.offsetHeight - 1),
      y: optionElement.offsetTop,
    });
  }, []);

  const activateOption = (nextValue: ColumnRole) => {
    const optionElement = optionRefs.current.get(nextValue);

    if (!optionElement) {
      return;
    }

    setActiveOptionValue(nextValue);
    setHighlightRect({
      height: Math.max(0, optionElement.offsetHeight - 1),
      y: optionElement.offsetTop,
    });
  };

  useEffect(() => {
    if (!isOpen) {
      setActiveOptionValue(null);
      setHighlightRect(null);
      setIsHighlightVisible(false);
      setIsClosing(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      void update();
      syncHighlightToOption(value);
      setIsHighlightVisible(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, syncHighlightToOption, update, value]);

  useEffect(
    () => () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (rootRef.current?.contains(target) || refs.floating.current?.contains(target)) {
        return;
      }

      closeDropdown();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDropdown();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDropdown, isOpen]);

  return (
    <div className="relative inline-block w-full" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t("learning.role.aria", { column: columnLabel })}
        className={`learning-grid-control flex min-h-12 w-full items-center justify-between gap-3 border border-neutral-300 bg-neutral-100/90 px-6 py-3 text-left text-base font-medium text-foreground backdrop-blur-xl supports-[backdrop-filter]:bg-neutral-100/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-70 [@media_(min-width:2200px)]:min-h-24 [@media_(min-width:2200px)]:px-7 [@media_(min-width:2200px)]:py-3.5 [@media_(min-width:2200px)]:text-lg ${disabled ? "" : "cursor-pointer"}`}
        disabled={disabled}
        onClick={toggleDropdown}
        ref={refs.setReference}
        type="button"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDownIcon
          aria-hidden="true"
          className={`block size-4 shrink-0 text-current transition-transform duration-150 [@media_(min-width:2200px)]:size-5 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen ? (
            <motion.div
              animate={reduceDropdownMotion ? { opacity: 1 } : "open"}
              aria-label={t("learning.role.aria", { column: columnLabel })}
              className="relative z-[100] origin-top overflow-y-auto bg-transparent text-neutral-700 before:absolute before:top-0 before:right-0 before:left-0 before:z-30 before:h-px before:bg-neutral-300"
              exit={reduceDropdownMotion ? { opacity: 0 } : "closed"}
              id={menuId}
              initial={reduceDropdownMotion ? { opacity: 0 } : "closed"}
              onPointerLeave={() => {
                setActiveOptionValue(null);
                syncHighlightToOption(value);
              }}
              ref={refs.setFloating}
              role="listbox"
              style={floatingStyles}
              transition={reduceDropdownMotion ? { duration: 0.08 } : undefined}
              variants={reduceDropdownMotion ? undefined : roleDropdownPanelVariants}
            >
              {highlightRect ? (
                <motion.span
                  aria-hidden="true"
                  animate={{
                    height: highlightRect.height,
                    opacity: isHighlightVisible ? 1 : 0,
                    y: highlightRect.y,
                  }}
                  className="pointer-events-none absolute top-0 right-px left-px z-10 transform-gpu bg-cyan-500 will-change-transform"
                  initial={false}
                  transition={
                    reduceDropdownMotion
                      ? { duration: 0 }
                      : {
                          height: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
                          opacity: isHighlightVisible
                            ? { duration: 0, ease: [0, 0, 0.2, 1] }
                            : { duration: 0.08, ease: [0.4, 0, 1, 1] },
                          y: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
                        }
                  }
                />
              ) : null}
              {roleOptions.map((optionValue, optionIndex) => {
                const isHighlighted = highlightedOptionValue === optionValue;
                const optionLabel = getRoleOptionLabel(optionValue, t);
                const optionMotionProps = reduceDropdownMotion
                  ? {}
                  : {
                      animate: { opacity: isClosing ? 0 : 1 },
                      initial: { opacity: 0 },
                      transition: {
                        delay: isClosing
                          ? 0.08 + (roleOptions.length - 1 - optionIndex) * 0.035
                          : 0.02 + optionIndex * 0.045,
                        duration: isClosing ? 0.13 : 0.16,
                        ease: isClosing ? [0.4, 0, 1, 1] : [0, 0, 0.2, 1],
                      },
                    };

                return (
                  <div
                    className="relative"
                    key={optionValue}
                    onPointerEnter={() => activateOption(optionValue)}
                    ref={(node) => {
                      if (node) {
                        optionRefs.current.set(optionValue, node);
                      } else {
                        optionRefs.current.delete(optionValue);
                      }
                    }}
                  >
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-0 z-0 bg-neutral-100"
                      {...optionMotionProps}
                    />
                    <motion.button
                      aria-selected={value === optionValue}
                      className={`relative z-20 block w-full cursor-pointer overflow-hidden border-x border-b border-x-neutral-300 border-b-neutral-200 bg-transparent px-5 py-3 text-left text-base font-medium transition-colors duration-150 first:border-t first:border-t-neutral-300 last:border-b-neutral-300 focus-visible:outline-none [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-4 [@media_(min-width:2200px)]:text-lg ${
                        isHighlighted ? "text-neutral-50" : "text-neutral-700"
                      }`}
                      onClick={() => selectRole(optionValue)}
                      onFocus={() => activateOption(optionValue)}
                      role="option"
                      type="button"
                      {...optionMotionProps}
                    >
                      <span className="relative z-20">{optionLabel}</span>
                    </motion.button>
                  </div>
                );
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

function ColumnRoleExerciseView({
  assignments,
  columns,
  edgeCompensationClassName,
  exercise,
  isReviewMode,
  onUpdateAssignment,
}: {
  assignments: Record<string, ColumnRole>;
  columns: NonNullable<ReturnType<typeof getDatasetView>>["columns"];
  edgeCompensationClassName: string;
  exercise: TableColumnRoleExercise;
  isReviewMode: boolean;
  onUpdateAssignment: (columnId: string, role: ColumnRole) => void;
}) {
  return (
    <>
      <div
        className={`learning-sheet-cell learning-extend-left learning-extend-right col-span-full ${edgeCompensationClassName} px-6 py-5 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:px-12 [@media_(min-width:2200px)]:py-8 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8`}
      >
        {exercise.instruction}
      </div>
      <div
        className={`learning-sheet-cell learning-extend-left learning-extend-right col-span-full ${edgeCompensationClassName} grid gap-4 p-6 [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:p-12`}
      >
        {columns.map((column) => (
          <div
            className="grid gap-4 border learning-grid-border p-5 sm:grid-cols-[minmax(0,1fr)_288px] sm:items-center [@media_(min-width:2200px)]:grid-cols-[minmax(0,1fr)_384px] [@media_(min-width:2200px)]:gap-6 [@media_(min-width:2200px)]:p-6"
            key={column.id}
          >
            <span>
              <span className="block text-base font-semibold text-foreground [@media_(min-width:2200px)]:text-lg">
                {column.label}
              </span>
              <span className="mt-1.5 block text-base text-muted-foreground [@media_(min-width:2200px)]:text-lg">
                {column.id}
              </span>
            </span>
            <RoleDropdown
              columnLabel={column.label}
              disabled={isReviewMode}
              onChange={(role) => onUpdateAssignment(column.id, role)}
              value={assignments[column.id] ?? "ignore"}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function MultipleChoiceExerciseView({
  edgeCompensationClassName,
  exercise,
  isReviewMode,
  onToggleOption,
  result,
  submittedSelectedOptionIds,
  selectedOptionIds,
}: {
  edgeCompensationClassName: string;
  exercise: MultipleChoiceExercise;
  isReviewMode: boolean;
  onToggleOption: (optionId: string) => void;
  result: EvaluationResult | null;
  submittedSelectedOptionIds: string[];
  selectedOptionIds: string[];
}) {
  const { t } = useLocalization();
  const shouldShowCorrectIndicator = result?.status === "correct";
  const shouldShowSubmittedOptionFeedback = result !== null && result.status !== "correct";
  const isSingleOptionExercise = exercise.correctOptionIds.length === 1;

  return (
    <div
      className={`learning-sheet-cell learning-extend-left learning-extend-right col-span-full ${edgeCompensationClassName} grid gap-4 p-6 [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:p-12`}
    >
      {exercise.options.map((option) => {
        const isCorrectOption = exercise.correctOptionIds.includes(option.id);
        const isSelectedOption = selectedOptionIds.includes(option.id);
        const isSubmittedOption = submittedSelectedOptionIds.includes(option.id);
        const shouldShowCorrectForOption = shouldShowCorrectIndicator && isCorrectOption;
        const shouldShowSubmittedFeedbackForOption =
          shouldShowSubmittedOptionFeedback && isSubmittedOption;
        const shouldShowOptionFeedback =
          shouldShowCorrectForOption || shouldShowSubmittedFeedbackForOption;
        const isPositiveFeedback = isCorrectOption;

        return (
          <div className="grid" key={option.id}>
            {shouldShowOptionFeedback ? (
              <div className="flex min-h-16 items-center gap-3 border border-b-0 learning-grid-border px-5 py-4 [@media_(min-width:2200px)]:min-h-20 [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-5">
                {isPositiveFeedback ? (
                  <CheckCircleIcon
                    aria-hidden="true"
                    className="size-6 shrink-0 text-emerald-500 [@media_(min-width:2200px)]:size-7"
                  />
                ) : (
                  <XCircleIcon
                    aria-hidden="true"
                    className="size-6 shrink-0 text-rose-500 [@media_(min-width:2200px)]:size-7"
                  />
                )}
                <h3 className="text-xl font-semibold text-foreground [@media_(min-width:2200px)]:text-3xl">
                  {isPositiveFeedback
                    ? t("learning.feedback.correct")
                    : t("learning.feedback.incorrect")}
                </h3>
              </div>
            ) : null}
            <label
              className={`flex min-h-16 items-center gap-4 border learning-grid-border px-5 py-4 [@media_(min-width:2200px)]:min-h-20 [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-5 ${
                isReviewMode ? "cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <input
                checked={isSelectedOption}
                className="peer sr-only"
                disabled={isReviewMode}
                name={exercise.id}
                onChange={() => onToggleOption(option.id)}
                type={isSingleOptionExercise ? "radio" : "checkbox"}
              />
              <span className="flex size-5 shrink-0 items-center justify-center border border-neutral-300 bg-white text-transparent transition-colors peer-checked:border-emerald-500 peer-checked:bg-emerald-500 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-500 [@media_(min-width:2200px)]:size-6">
                <CheckIcon
                  aria-hidden="true"
                  className="size-4 stroke-[3.25] [@media_(min-width:2200px)]:size-5"
                />
              </span>
              <span className="text-base leading-7 text-foreground [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
                {option.label}
              </span>
            </label>
          </div>
        );
      })}
    </div>
  );
}

function OrderedStepsExerciseView({
  edgeCompensationClassName,
  exercise,
  isReviewMode,
  onMoveStep,
  orderedStepIds,
}: {
  edgeCompensationClassName: string;
  exercise: OrderedStepsExercise;
  isReviewMode: boolean;
  onMoveStep: (index: number, direction: -1 | 1) => void;
  orderedStepIds: string[];
}) {
  const { t } = useLocalization();
  const stepById = new Map(exercise.steps.map((step) => [step.id, step]));

  return (
    <ol
      className={`learning-sheet-cell learning-extend-left learning-extend-right col-span-full ${edgeCompensationClassName} grid gap-4 p-6 [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:p-12`}
    >
      {orderedStepIds.map((stepId, index) => {
        const step = stepById.get(stepId);

        if (!step) {
          return null;
        }

        return (
          <li
            className="grid gap-4 border learning-grid-border p-5 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:p-6"
            key={step.id}
          >
            <span className="learning-grid-panel-fill flex size-12 items-center justify-center text-base font-semibold text-foreground [@media_(min-width:2200px)]:size-24 [@media_(min-width:2200px)]:text-lg">
              {index + 1}
            </span>
            <span className="text-base font-medium text-foreground [@media_(min-width:2200px)]:text-lg">
              {step.label}
            </span>
            <span className="flex gap-3 [@media_(min-width:2200px)]:gap-4">
              <button
                aria-label={t("learning.move.up", { label: step.label })}
                className="learning-grid-panel-fill inline-flex size-12 cursor-pointer items-center justify-center text-foreground disabled:cursor-not-allowed disabled:opacity-40 [@media_(min-width:2200px)]:size-24"
                disabled={isReviewMode || index === 0}
                onClick={() => onMoveStep(index, -1)}
                type="button"
              >
                <ArrowUpIcon
                  aria-hidden="true"
                  className="size-5 [@media_(min-width:2200px)]:size-6"
                />
              </button>
              <button
                aria-label={t("learning.move.down", { label: step.label })}
                className="learning-grid-panel-fill inline-flex size-12 cursor-pointer items-center justify-center text-foreground disabled:cursor-not-allowed disabled:opacity-40 [@media_(min-width:2200px)]:size-24"
                disabled={isReviewMode || index === orderedStepIds.length - 1}
                onClick={() => onMoveStep(index, 1)}
                type="button"
              >
                <ArrowDownIcon
                  aria-hidden="true"
                  className="size-5 [@media_(min-width:2200px)]:size-6"
                />
              </button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function LessonResult({ result }: { result: EvaluationResult }) {
  const { t } = useLocalization();
  const resultCellClassName =
    result.status === "correct"
      ? "learning-extend-left learning-extend-right col-span-full"
      : "learning-extend-left col-span-full [@media_(min-width:1024px)]:col-span-8";
  const shouldShowResultBody = result.status !== "correct";

  return (
    <div
      aria-live="polite"
      className={`learning-sheet-cell ${resultCellClassName} flex gap-4 p-6 [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:p-12`}
    >
      {result.status === "correct" ? (
        <CheckCircleIcon
          aria-hidden="true"
          className="size-7 shrink-0 text-emerald-500 [@media_(min-width:2200px)]:size-8"
        />
      ) : result.status === "incorrect" ? (
        <XCircleIcon
          aria-hidden="true"
          className="size-7 shrink-0 text-rose-500 [@media_(min-width:2200px)]:size-8"
        />
      ) : (
        <InformationCircleIcon
          aria-hidden="true"
          className="size-7 shrink-0 text-sky-600 [@media_(min-width:2200px)]:size-8"
        />
      )}
      <div>
        <h2 className="text-xl font-semibold text-foreground [@media_(min-width:2200px)]:text-3xl">
          {result.status === "correct"
            ? t("learning.result.correct")
            : result.status === "partial"
              ? t("learning.result.partial")
              : t("learning.result.incorrect")}
        </h2>
        {shouldShowResultBody ? (
          <>
            <p className="mt-3 text-base leading-6 text-muted-foreground [@media_(min-width:2200px)]:mt-4 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-7">
              {result.message}
            </p>
            <p className="mt-2 text-base leading-6 text-muted-foreground [@media_(min-width:2200px)]:mt-3 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-7">
              {result.nextStep}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function LessonHintPanel({
  hints,
  onToggleHints,
  visibleHintCount,
}: {
  hints: string[];
  onToggleHints: () => void;
  visibleHintCount: number;
}) {
  const { t } = useLocalization();
  const areHintsVisible = visibleHintCount > 0;
  const areAllHintsVisible = visibleHintCount >= hints.length;
  const buttonLabel = areHintsVisible
    ? areAllHintsVisible
      ? t("learning.hint.hide")
      : t("learning.hint.showMore")
    : t("learning.hint.show");

  return (
    <aside className="learning-sheet-cell learning-extend-left learning-extend-right learning-sheet-cell-fill col-span-full -mr-px p-6 [@media_(min-width:1024px)]:col-span-4 [@media_(min-width:2200px)]:p-12">
      <h2 className="flex items-center gap-3 text-xl font-semibold text-foreground [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:text-3xl">
        <LightBulbIcon
          aria-hidden="true"
          className="size-6 text-amber-500 [@media_(min-width:2200px)]:size-7"
        />
        {t("learning.hint")}
      </h2>
      {areHintsVisible ? (
        <ol className="mt-6 grid gap-4 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:mt-8 [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
          {hints.slice(0, visibleHintCount).map((hint, index) => (
            <li className="learning-grid-panel-fill p-5 [@media_(min-width:2200px)]:p-6" key={hint}>
              {index + 1}. {hint}
            </li>
          ))}
        </ol>
      ) : null}
      <LiquidButton
        className={`${amberLiquidButtonClassName} mt-5 w-full cursor-pointer [@media_(min-width:2200px)]:mt-7 [@media_(min-width:2200px)]:min-h-16`}
        onClick={onToggleHints}
        type="button"
      >
        {buttonLabel}
      </LiquidButton>
    </aside>
  );
}
