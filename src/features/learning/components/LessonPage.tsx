import { CheckCircleIcon, InformationCircleIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

import { getDatasetView } from "../datasets/registry";
import {
  describeExpectedRole,
  evaluateFeatureTargetRoles,
  getExpectedColumnRoles,
} from "../evaluation/evaluate-feature-target";
import type { ColumnRole, EvaluationResult, Lesson } from "../types";
import { LearningHeader } from "./LearningHeader";
import { LiquidButton, LiquidLink } from "@/components/ui/liquid-button";

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
  const datasetView = getDatasetView(lesson.datasetId, lesson.viewId);
  const expectedRoles = useMemo(() => getExpectedColumnRoles(), []);
  const initialAssignments = useMemo(
    () =>
      Object.keys(expectedRoles).reduce<Record<string, ColumnRole>>((assignments, columnId) => {
        assignments[columnId] = "ignore";
        return assignments;
      }, {}),
    [expectedRoles],
  );
  const [assignments, setAssignments] = useState<Record<string, ColumnRole>>(initialAssignments);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [visibleHintCount, setVisibleHintCount] = useState(1);

  if (!datasetView) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <LearningHeader backHref="/learn" backLabel="Back to Learning Home" />
        <section className="mx-auto mt-20 max-w-lg rounded-lg border border-border bg-surface p-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">Lesson cannot be opened</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The dataset view for this lesson is not available yet.
          </p>
          <LiquidLink className="mt-5" data-app-link href="/learn">
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

  const submitAnswer = () => {
    const evaluation = evaluateFeatureTargetRoles(assignments);
    setResult(evaluation);
    onSubmitResult(evaluation);

    if (evaluation.status !== "correct") {
      setVisibleHintCount(2);
    }
  };

  const hints = [
    "The target usually answers the question: what value do we want to predict?",
    "A feature is information that is already known before the prediction is made.",
    "An ID column helps identify rows, but the ID is not why a property is expensive or cheap.",
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <LearningHeader backHref="/learn" backLabel="Back to Learning Home" />

      <div className="mx-auto grid w-[min(1180px,calc(100%_-_32px))] gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Lesson 0.1</span>
              <span aria-hidden="true">/</span>
              <span>{lesson.estimatedMinutes} minutes</span>
            </div>
            <div>
              <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-normal text-foreground">
                {lesson.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                {lesson.objective}
              </p>
            </div>
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

          <section
            aria-labelledby="dataset-preview"
            className="rounded-lg border border-border bg-surface"
          >
            <div className="flex flex-col gap-2 border-b border-border p-5">
              <h2 className="text-lg font-semibold text-foreground" id="dataset-preview">
                Dataset preview
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                The goal is to prepare data for a model that predicts property prices.
              </p>
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

          <section
            aria-labelledby="exercise"
            className="rounded-lg border border-border bg-surface"
          >
            <div className="border-b border-border p-5">
              <p className="text-sm font-medium text-sky-300">Exercise</p>
              <h2 className="mt-2 text-lg font-semibold text-foreground" id="exercise">
                Assign a role to each column
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Choose one target, several safe features, and metadata when present.
              </p>
            </div>

            <div className="grid gap-3 p-5">
              {datasetView.columns.map((column) => (
                <label
                  className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center"
                  key={column.id}
                >
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      {column.label}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Column ID: {column.id}
                    </span>
                  </span>
                  <select
                    aria-label={`Role for ${column.label}`}
                    className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                    onChange={(event) =>
                      updateAssignment(column.id, event.target.value as ColumnRole)
                    }
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

            <div className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-muted-foreground">
                Submit will evaluate the column roles automatically.
              </p>
              <LiquidButton className="min-h-11" onClick={submitAnswer} type="button">
                Submit answer
              </LiquidButton>
            </div>
          </section>

          {result ? (
            <section aria-live="polite" className="rounded-lg border border-border bg-surface p-5">
              <div className="flex gap-3">
                {result.status === "correct" ? (
                  <CheckCircleIcon
                    aria-hidden="true"
                    className="size-6 shrink-0 text-emerald-300"
                  />
                ) : (
                  <InformationCircleIcon
                    aria-hidden="true"
                    className="size-6 shrink-0 text-sky-300"
                  />
                )}
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{result.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.message}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.nextStep}</p>
                  {result.status !== "correct" ? (
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
          ) : null}
        </article>

        <aside className="flex h-fit flex-col gap-4">
          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <LightBulbIcon aria-hidden="true" className="size-5 text-emerald-300" />
              Hint
            </h2>
            <ol className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
              {hints.slice(0, visibleHintCount).map((hint, index) => (
                <li className="rounded-lg bg-muted p-3" key={hint}>
                  {index + 1}. {hint}
                </li>
              ))}
            </ol>
            {visibleHintCount < hints.length ? (
              <LiquidButton
                className="mt-4 w-full"
                onClick={() => setVisibleHintCount((count) => Math.min(count + 1, hints.length))}
                type="button"
              >
                Show another hint
              </LiquidButton>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold text-foreground">Completion</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The lesson is complete when the column roles are correct and feedback is shown.
            </p>
            <LiquidLink className="mt-4 w-full" data-app-link href="/learn">
              Back to Learning Home
            </LiquidLink>
          </section>
        </aside>
      </div>
    </main>
  );
}
