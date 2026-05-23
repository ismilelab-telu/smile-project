import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";

import { getDatasetView } from "../datasets/registry";
import {
  evaluateMultipleChoice,
  evaluateOrderedSteps,
} from "../evaluation/evaluate-lesson-exercises";
import {
  describeExpectedRole,
  evaluateFeatureTargetRoles,
  getExpectedColumnRoles,
} from "../evaluation/evaluate-feature-target";
import type {
  ColumnRole,
  EvaluationResult,
  Lesson,
  MultipleChoiceExercise,
  OrderedStepsExercise,
  TableColumnRoleExercise,
} from "../types";
import { LearningHeader } from "./LearningHeader";
import { LiquidButton, LiquidLink } from "@/components/ui/liquid-button";

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-neutral-50 backdrop-blur-xl shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.16),0_12px_32px_oklch(0%_0_0_/_0.22)] [--liquid-button-background-color:oklch(100%_0_0_/_0.08)] [--liquid-button-color:var(--color-emerald-500)]";

type LessonPageProps = {
  lesson: Lesson;
  onSubmitResult: (result: EvaluationResult) => void;
};

const roleOptions: Array<{ label: string; value: ColumnRole }> = [
  { label: "Ignore / not used yet", value: "ignore" },
  { label: "Target", value: "target" },
  { label: "Safe feature", value: "safe-feature" },
  { label: "Metadata", value: "metadata" },
];

export function LessonPage({ lesson, onSubmitResult }: LessonPageProps) {
  const expectedRoles = useMemo(() => getExpectedColumnRoles(), []);
  const initialAssignments = useMemo(
    () =>
      Object.keys(expectedRoles).reduce<Record<string, ColumnRole>>((assignments, columnId) => {
        assignments[columnId] = "ignore";
        return assignments;
      }, {}),
    [expectedRoles],
  );
  const initialOrderedStepIds = useMemo(
    () =>
      lesson.exercise.type === "ordered-steps" ? lesson.exercise.steps.map((step) => step.id) : [],
    [lesson.exercise],
  );
  const [assignments, setAssignments] = useState<Record<string, ColumnRole>>(initialAssignments);
  const [orderedStepIds, setOrderedStepIds] = useState<string[]>(initialOrderedStepIds);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [visibleHintCount, setVisibleHintCount] = useState(1);
  const datasetView =
    lesson.exercise.type === "table-column-role-assignment" && lesson.datasetId && lesson.viewId
      ? getDatasetView(lesson.datasetId, lesson.viewId)
      : undefined;

  useEffect(() => {
    setAssignments(initialAssignments);
    setOrderedStepIds(initialOrderedStepIds);
    setResult(null);
    setSelectedOptionIds([]);
    setVisibleHintCount(1);
  }, [initialAssignments, initialOrderedStepIds, lesson.id]);

  if (lesson.exercise.type === "table-column-role-assignment" && !datasetView) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <LearningHeader backHref="/learn" backLabel="Back to Learning Home" />
        <section className="mx-auto mt-20 max-w-lg rounded-lg border border-border bg-surface p-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">Lesson cannot be opened</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The dataset view for this lesson is not available yet.
          </p>
          <LiquidLink className={`${liquidButtonClassName} mt-5`} data-app-link href="/learn">
            Back to Learning Home
          </LiquidLink>
        </section>
      </main>
    );
  }

  const updateAssignment = (columnId: string, role: ColumnRole) => {
    setAssignments((current) => ({
      ...current,
      [columnId]: role,
    }));
    setResult(null);
  };

  const toggleOption = (optionId: string) => {
    setSelectedOptionIds((current) =>
      current.includes(optionId)
        ? current.filter((selectedOptionId) => selectedOptionId !== optionId)
        : [...current, optionId],
    );
    setResult(null);
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setOrderedStepIds((current) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [stepId] = next.splice(index, 1);
      next.splice(nextIndex, 0, stepId);

      return next;
    });
    setResult(null);
  };

  const submitAnswer = () => {
    let evaluation: EvaluationResult;

    if (lesson.exercise.type === "multiple-choice") {
      evaluation = evaluateMultipleChoice(lesson.exercise, selectedOptionIds);
    } else if (lesson.exercise.type === "ordered-steps") {
      evaluation = evaluateOrderedSteps(lesson.exercise, orderedStepIds);
    } else {
      evaluation = evaluateFeatureTargetRoles(assignments);
    }

    setResult(evaluation);
    onSubmitResult(evaluation);

    if (evaluation.status !== "correct") {
      setVisibleHintCount(2);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <LearningHeader backHref="/learn" backLabel="Back to Learning Home" />

      <div className="mx-auto grid w-[min(1180px,calc(100%_-_32px))] gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{lesson.numberLabel}</span>
              <span aria-hidden="true">/</span>
              <span>{lesson.estimatedMinutes} minutes</span>
            </div>
            <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-normal text-foreground">
              {lesson.title}
            </h1>
          </section>

          <section
            aria-labelledby="concept-summary"
            className="rounded-lg border border-border bg-surface p-5"
          >
            <h2 className="text-lg font-semibold text-foreground" id="concept-summary">
              Concept summary
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              {lesson.summary.map((paragraph) => (
                <p className="text-sm leading-6 text-muted-foreground" key={paragraph}>
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          {lesson.exercise.type === "table-column-role-assignment" && datasetView ? (
            <DatasetPreview exercise={lesson.exercise} datasetView={datasetView} />
          ) : null}

          <section
            aria-labelledby="exercise"
            className="rounded-lg border border-border bg-surface"
          >
            <div className="border-b border-border p-5">
              <p className="text-sm font-medium text-sky-300">Exercise</p>
              <h2 className="mt-2 text-lg font-semibold text-foreground" id="exercise">
                {lesson.exercise.prompt}
              </h2>
            </div>

            {lesson.exercise.type === "multiple-choice" ? (
              <MultipleChoiceExerciseView
                exercise={lesson.exercise}
                selectedOptionIds={selectedOptionIds}
                onToggleOption={toggleOption}
              />
            ) : null}

            {lesson.exercise.type === "ordered-steps" ? (
              <OrderedStepsExerciseView
                exercise={lesson.exercise}
                orderedStepIds={orderedStepIds}
                onMoveStep={moveStep}
              />
            ) : null}

            {lesson.exercise.type === "table-column-role-assignment" && datasetView ? (
              <ColumnRoleExerciseView
                assignments={assignments}
                columns={datasetView.columns}
                exercise={lesson.exercise}
                onUpdateAssignment={updateAssignment}
              />
            ) : null}

            <div className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-muted-foreground">
                Submit will evaluate your answer automatically.
              </p>
              <LiquidButton
                className={`${liquidButtonClassName} min-h-11 cursor-pointer`}
                onClick={submitAnswer}
                type="button"
              >
                Submit answer
              </LiquidButton>
            </div>
          </section>

          {result ? <LessonResult result={result} /> : null}
        </article>

        <aside className="flex h-fit flex-col gap-4">
          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <LightBulbIcon aria-hidden="true" className="size-5 text-emerald-300" />
              Hint
            </h2>
            <ol className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
              {lesson.exercise.hints.slice(0, visibleHintCount).map((hint, index) => (
                <li className="rounded-lg bg-muted p-3" key={hint}>
                  {index + 1}. {hint}
                </li>
              ))}
            </ol>
            {visibleHintCount < lesson.exercise.hints.length ? (
              <LiquidButton
                className={`${liquidButtonClassName} mt-4 w-full cursor-pointer`}
                onClick={() =>
                  setVisibleHintCount((count) => Math.min(count + 1, lesson.exercise.hints.length))
                }
                type="button"
              >
                Show another hint
              </LiquidButton>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold text-foreground">Completion</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The lesson is complete when the answer is correct and feedback is shown.
            </p>
            <LiquidLink
              className={`${liquidButtonClassName} mt-4 w-full`}
              data-app-link
              href="/learn"
            >
              Back to Learning Home
            </LiquidLink>
          </section>
        </aside>
      </div>
    </main>
  );
}

function DatasetPreview({
  datasetView,
  exercise,
}: {
  datasetView: NonNullable<ReturnType<typeof getDatasetView>>;
  exercise: TableColumnRoleExercise;
}) {
  return (
    <section
      aria-labelledby="dataset-preview"
      className="rounded-lg border border-border bg-surface"
    >
      <div className="flex flex-col gap-2 border-b border-border p-5">
        <h2 className="text-lg font-semibold text-foreground" id="dataset-preview">
          Dataset preview
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">{exercise.datasetContext}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-muted">
              {datasetView.columns.map((column) => (
                <th
                  className="border-b border-border px-4 py-3 font-semibold text-foreground"
                  key={column.id}
                  scope="col"
                >
                  <span className="flex flex-col gap-1">
                    <span>{column.label}</span>
                    {column.unit ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {column.unit}
                      </span>
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datasetView.rows.map((row) => (
              <tr className="odd:bg-surface even:bg-muted/60" key={row.id}>
                {datasetView.columns.map((column) => (
                  <td
                    className="border-b border-border px-4 py-3 text-muted-foreground"
                    key={column.id}
                  >
                    {String(row.values[column.id] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ColumnRoleExerciseView({
  assignments,
  columns,
  exercise,
  onUpdateAssignment,
}: {
  assignments: Record<string, ColumnRole>;
  columns: NonNullable<ReturnType<typeof getDatasetView>>["columns"];
  exercise: TableColumnRoleExercise;
  onUpdateAssignment: (columnId: string, role: ColumnRole) => void;
}) {
  return (
    <>
      <p className="border-b border-border px-5 py-4 text-sm leading-6 text-muted-foreground">
        {exercise.instruction}
      </p>
      <div className="grid gap-3 p-5">
        {columns.map((column) => (
          <label
            className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center"
            key={column.id}
          >
            <span>
              <span className="block text-sm font-semibold text-foreground">{column.label}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Column ID: {column.id}
              </span>
            </span>
            <select
              aria-label={`Role for ${column.label}`}
              className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              onChange={(event) => onUpdateAssignment(column.id, event.target.value as ColumnRole)}
              value={assignments[column.id] ?? "ignore"}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </>
  );
}

function MultipleChoiceExerciseView({
  exercise,
  onToggleOption,
  selectedOptionIds,
}: {
  exercise: MultipleChoiceExercise;
  onToggleOption: (optionId: string) => void;
  selectedOptionIds: string[];
}) {
  return (
    <div className="grid gap-3 p-5">
      {exercise.options.map((option) => (
        <label
          className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-border p-4"
          key={option.id}
        >
          <input
            checked={selectedOptionIds.includes(option.id)}
            className="size-4 accent-emerald-500"
            onChange={() => onToggleOption(option.id)}
            type="checkbox"
          />
          <span className="text-sm leading-6 text-foreground">{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function OrderedStepsExerciseView({
  exercise,
  onMoveStep,
  orderedStepIds,
}: {
  exercise: OrderedStepsExercise;
  onMoveStep: (index: number, direction: -1 | 1) => void;
  orderedStepIds: string[];
}) {
  const stepById = new Map(exercise.steps.map((step) => [step.id, step]));

  return (
    <ol className="grid gap-3 p-5">
      {orderedStepIds.map((stepId, index) => {
        const step = stepById.get(stepId);

        if (!step) {
          return null;
        }

        return (
          <li
            className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center"
            key={step.id}
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-foreground">
              {index + 1}
            </span>
            <span className="text-sm font-medium text-foreground">{step.label}</span>
            <span className="flex gap-2">
              <button
                aria-label={`Move ${step.label} up`}
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg bg-muted text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                disabled={index === 0}
                onClick={() => onMoveStep(index, -1)}
                type="button"
              >
                <ArrowUpIcon aria-hidden="true" className="size-4" />
              </button>
              <button
                aria-label={`Move ${step.label} down`}
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg bg-muted text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                disabled={index === orderedStepIds.length - 1}
                onClick={() => onMoveStep(index, 1)}
                type="button"
              >
                <ArrowDownIcon aria-hidden="true" className="size-4" />
              </button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function LessonResult({ result }: { result: EvaluationResult }) {
  return (
    <section aria-live="polite" className="rounded-lg border border-border bg-surface p-5">
      <div className="flex gap-3">
        {result.status === "correct" ? (
          <CheckCircleIcon aria-hidden="true" className="size-6 shrink-0 text-emerald-300" />
        ) : (
          <InformationCircleIcon aria-hidden="true" className="size-6 shrink-0 text-sky-300" />
        )}
        <div>
          <h2 className="text-lg font-semibold text-foreground">{result.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.message}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.nextStep}</p>
          {result.status !== "correct" && result.missedColumnIds.length > 0 ? (
            <div className="mt-4 rounded-lg bg-muted p-4">
              <p className="text-sm font-semibold text-foreground">Expected role check</p>
              <ul className="mt-2 grid gap-1 text-sm leading-6 text-muted-foreground">
                {result.missedColumnIds.map((columnId) => (
                  <li key={columnId}>
                    {columnId}: {describeExpectedRole(columnId)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
