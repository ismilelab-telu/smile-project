import {
  ArrowLeftIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

import { getDatasetView } from "../datasets/registry";
import {
  describeExpectedRole,
  evaluateFeatureTargetRoles,
  getExpectedColumnRoles,
} from "../evaluation/evaluate-feature-target";
import type { ColumnRole, EvaluationResult, Lesson } from "../types";

type LessonPageProps = {
  lesson: Lesson;
  onSubmitResult: (result: EvaluationResult) => void;
};

const roleOptions: Array<{ label: string; value: ColumnRole }> = [
  { label: "Ignore / belum dipakai", value: "ignore" },
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
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <section className="max-w-lg rounded-lg border border-border bg-surface p-6 text-center">
          <h1 className="text-xl font-semibold text-neutral-950">Lesson tidak bisa dibuka</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Dataset view untuk lesson ini belum tersedia.
          </p>
          <a
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
            data-app-link
            href="/learn"
          >
            Kembali ke Learning Home
          </a>
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
    "Target biasanya menjawab pertanyaan: nilai apa yang ingin diprediksi?",
    "Feature adalah informasi yang sudah diketahui sebelum prediksi dibuat.",
    "Kolom ID membantu membedakan baris, tetapi ID bukan alasan sebuah properti menjadi mahal atau murah.",
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-[min(1180px,calc(100%_-_32px))] items-center justify-between py-5">
          <a
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            data-app-link
            href="/learn"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Learning Home
          </a>
          <p className="text-sm font-semibold text-neutral-500">Module 0</p>
        </div>
      </header>

      <div className="mx-auto grid w-[min(1180px,calc(100%_-_32px))] gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="flex flex-col gap-8">
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Lesson 0.1</span>
              <span aria-hidden="true">/</span>
              <span>{lesson.estimatedMinutes} menit</span>
            </div>
            <div>
              <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-normal text-neutral-950">
                {lesson.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-600">
                {lesson.objective}
              </p>
            </div>
          </section>

          <section
            aria-labelledby="concept-summary"
            className="rounded-lg border border-border bg-surface p-5"
          >
            <h2 className="text-lg font-semibold text-neutral-950" id="concept-summary">
              Konsep singkat
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              {lesson.summary.map((paragraph) => (
                <p className="text-sm leading-6 text-neutral-600" key={paragraph}>
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
              <h2 className="text-lg font-semibold text-neutral-950" id="dataset-preview">
                Dataset preview
              </h2>
              <p className="text-sm leading-6 text-neutral-600">
                Tujuannya adalah menyiapkan data untuk model yang memprediksi harga properti.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="bg-neutral-50">
                    {datasetView.columns.map((column) => (
                      <th
                        className="border-b border-border px-4 py-3 font-semibold text-neutral-700"
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
                    <tr className="odd:bg-surface even:bg-neutral-50/70" key={row.id}>
                      {datasetView.columns.map((column) => (
                        <td
                          className="border-b border-border px-4 py-3 text-neutral-700"
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
              <p className="text-sm font-medium text-sky-700">Exercise</p>
              <h2 className="mt-2 text-lg font-semibold text-neutral-950" id="exercise">
                Tandai peran setiap kolom
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Pilih satu target, beberapa feature yang aman, dan metadata jika ada.
              </p>
            </div>

            <div className="grid gap-3 p-5">
              {datasetView.columns.map((column) => (
                <label
                  className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center"
                  key={column.id}
                >
                  <span>
                    <span className="block text-sm font-semibold text-neutral-950">
                      {column.label}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Column ID: {column.id}
                    </span>
                  </span>
                  <select
                    aria-label={`Role untuk ${column.label}`}
                    className="min-h-10 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
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
                Submit akan mengevaluasi role kolom secara otomatis.
              </p>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                onClick={submitAnswer}
                type="button"
              >
                Kirim jawaban
              </button>
            </div>
          </section>

          {result ? (
            <section aria-live="polite" className="rounded-lg border border-border bg-surface p-5">
              <div className="flex gap-3">
                {result.status === "correct" ? (
                  <CheckCircleIcon
                    aria-hidden="true"
                    className="size-6 shrink-0 text-emerald-600"
                  />
                ) : (
                  <InformationCircleIcon
                    aria-hidden="true"
                    className="size-6 shrink-0 text-sky-600"
                  />
                )}
                <div>
                  <h2 className="text-lg font-semibold text-neutral-950">{result.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">{result.message}</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">{result.nextStep}</p>
                  {result.status !== "correct" ? (
                    <div className="mt-4 rounded-lg bg-neutral-50 p-4">
                      <p className="text-sm font-semibold text-neutral-950">Cek role yang tepat</p>
                      <ul className="mt-2 grid gap-1 text-sm leading-6 text-neutral-600">
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
            <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-950">
              <LightBulbIcon aria-hidden="true" className="size-5 text-emerald-600" />
              Hint
            </h2>
            <ol className="mt-4 grid gap-3 text-sm leading-6 text-neutral-600">
              {hints.slice(0, visibleHintCount).map((hint, index) => (
                <li className="rounded-lg bg-neutral-50 p-3" key={hint}>
                  {index + 1}. {hint}
                </li>
              ))}
            </ol>
            {visibleHintCount < hints.length ? (
              <button
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                onClick={() => setVisibleHintCount((count) => Math.min(count + 1, hints.length))}
                type="button"
              >
                Tampilkan hint lain
              </button>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold text-neutral-950">Completion</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Lesson selesai jika role kolom benar dan feedback sudah tampil.
            </p>
            <a
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              data-app-link
              href="/learn"
            >
              Kembali ke Learning Home
            </a>
          </section>
        </aside>
      </div>
    </main>
  );
}
