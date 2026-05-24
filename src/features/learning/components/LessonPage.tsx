import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  InformationCircleIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useId, useMemo, useRef, useState } from "react";

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
  DatasetColumn,
  DatasetRow,
  EvaluationResult,
  Lesson,
  MultipleChoiceExercise,
  OrderedStepsExercise,
  TableColumnRoleExercise,
} from "../types";
import { LearningGridCanvas, LearningSheetExtensions } from "./LearningGridCanvas";
import { LearningHeader } from "./LearningHeader";
import { LiquidButton, LiquidLink } from "@/components/ui/liquid-button";
import { shouldReduceMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-3 rounded-none px-5 py-3 text-base font-semibold text-neutral-950 backdrop-blur-xl hover:text-neutral-50 [--liquid-button-background-color:var(--color-neutral-200)] [--liquid-button-color:var(--color-emerald-500)] [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-3.5 [@media_(min-width:2200px)]:text-lg";

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

const roleDropdownExitTimeScale = 2.5;

function getRoleOptionLabel(value: ColumnRole) {
  return roleOptions.find((option) => option.value === value)?.label ?? roleOptions[0].label;
}

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
      <LearningGridCanvas>
        <LearningHeader backHref="/learn" backLabel="Back to Learning Home" />
        <section className="learning-sheet route-content-transition-target mx-auto mt-20 grid max-w-xl text-center [@media_(min-width:2200px)]:max-w-3xl">
          <LearningSheetExtensions />

          <div className="learning-sheet-cell p-6 [@media_(min-width:2200px)]:p-12">
            <h1 className="text-2xl font-semibold text-foreground [@media_(min-width:2200px)]:text-4xl">
              Lesson cannot be opened
            </h1>
          </div>
          <div className="learning-sheet-cell p-6 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
            The dataset view for this lesson is not available yet.
          </div>
          <div className="learning-sheet-cell p-6 [@media_(min-width:2200px)]:p-12">
            <LiquidLink
              className={`${liquidButtonClassName} [@media_(min-width:2200px)]:min-h-16`}
              data-app-link
              href="/learn"
            >
              Back to Learning Home
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
    <LearningGridCanvas>
      <LearningHeader backHref="/learn" backLabel="Back to Learning Home" />

      <section className="learning-sheet route-content-transition-target mx-auto grid w-[min(1440px,calc(100%_-_48px))] grid-cols-1 [@media_(min-width:1024px)]:grid-cols-12 [@media_(min-width:2200px)]:w-[min(1776px,calc(100%_-_96px))]">
        <LearningSheetExtensions />

        <div className="learning-sheet-cell flex flex-wrap items-center gap-3 p-6 text-base text-muted-foreground [@media_(min-width:1024px)]:col-span-3 [@media_(min-width:2200px)]:p-12 [@media_(min-width:2200px)]:text-lg">
          <span>{lesson.numberLabel}</span>
          <span aria-hidden="true">/</span>
          <span>{lesson.estimatedMinutes} minutes</span>
        </div>

        <div className="learning-sheet-cell p-6 [@media_(min-width:1024px)]:col-span-9 [@media_(min-width:2200px)]:p-12">
          <h1 className="max-w-none text-5xl leading-tight font-semibold tracking-normal text-foreground [@media_(min-width:2200px)]:text-8xl">
            {lesson.title}
          </h1>
        </div>

        <section
          aria-labelledby="concept-summary"
          className="learning-sheet-cell p-6 [@media_(min-width:1024px)]:col-span-8 [@media_(min-width:2200px)]:p-12"
        >
          <h2
            className="text-xl font-semibold text-foreground [@media_(min-width:2200px)]:text-3xl"
            id="concept-summary"
          >
            Concept summary
          </h2>
          <div className="mt-6 grid gap-5 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:mt-8 [@media_(min-width:2200px)]:gap-6 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
            {lesson.summary.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <aside className="learning-sheet-cell learning-sheet-cell-fill p-6 [@media_(min-width:1024px)]:col-span-4 [@media_(min-width:2200px)]:p-12">
          <h2 className="flex items-center gap-3 text-xl font-semibold text-foreground [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:text-3xl">
            <LightBulbIcon
              aria-hidden="true"
              className="size-6 text-emerald-500 [@media_(min-width:2200px)]:size-7"
            />
            Hint
          </h2>
          <ol className="mt-6 grid gap-4 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:mt-8 [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
            {lesson.exercise.hints.slice(0, visibleHintCount).map((hint, index) => (
              <li
                className="learning-grid-panel-fill p-5 [@media_(min-width:2200px)]:p-6"
                key={hint}
              >
                {index + 1}. {hint}
              </li>
            ))}
          </ol>
          {visibleHintCount < lesson.exercise.hints.length ? (
            <LiquidButton
              className={`${liquidButtonClassName} mt-5 w-full cursor-pointer [@media_(min-width:2200px)]:mt-7 [@media_(min-width:2200px)]:min-h-16`}
              onClick={() =>
                setVisibleHintCount((count) => Math.min(count + 1, lesson.exercise.hints.length))
              }
              type="button"
            >
              Show another hint
            </LiquidButton>
          ) : null}
        </aside>

        {lesson.exercise.type === "table-column-role-assignment" && datasetView ? (
          <DatasetPreview exercise={lesson.exercise} datasetView={datasetView} />
        ) : null}

        <div className="learning-sheet-cell col-span-full p-6 [@media_(min-width:2200px)]:p-12">
          <p className="text-base font-medium text-sky-600 [@media_(min-width:2200px)]:text-lg">
            Exercise
          </p>
          <h2
            className="mt-3 text-xl font-semibold text-foreground [@media_(min-width:2200px)]:mt-4 [@media_(min-width:2200px)]:text-3xl"
            id="exercise"
          >
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

        <div className="learning-sheet-cell col-span-full flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between [@media_(min-width:2200px)]:gap-6 [@media_(min-width:2200px)]:p-12">
          <p className="text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
            Submit will evaluate your answer automatically.
          </p>
          <LiquidButton
            className={`${liquidButtonClassName} min-h-12 cursor-pointer [@media_(min-width:2200px)]:min-h-16`}
            onClick={submitAnswer}
            type="button"
          >
            Submit answer
          </LiquidButton>
        </div>

        {result ? <LessonResult result={result} /> : null}
      </section>
    </LearningGridCanvas>
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
  exercise,
}: {
  datasetView: NonNullable<ReturnType<typeof getDatasetView>>;
  exercise: TableColumnRoleExercise;
}) {
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
      <section className="learning-sheet-cell col-span-full flex flex-col gap-3 p-6 [@media_(min-width:2200px)]:gap-4 [@media_(min-width:2200px)]:p-12">
        <h2
          className="text-xl font-semibold text-foreground [@media_(min-width:2200px)]:text-3xl"
          id="dataset-preview"
        >
          Dataset preview
        </h2>
        <p className="text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
          {exercise.datasetContext}
        </p>
      </section>
      <div className="learning-sheet-cell col-span-full overflow-hidden">
        <div className="overflow-x-auto">
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
                          aria-label={`Sort by ${sortLabel}`}
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
                      className="border-b learning-grid-border px-5 py-4 text-muted-foreground [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-5"
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
  onChange,
  value,
}: {
  columnLabel: string;
  onChange: (role: ColumnRole) => void;
  value: ColumnRole;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = getRoleOptionLabel(value);

  const { contextSafe } = useGSAP(
    () => {
      const root = rootRef.current;

      if (!root) {
        return;
      }

      const menu = root.querySelector<HTMLElement>("[data-role-dropdown-menu]");
      const arrow = root.querySelector<HTMLElement>("[data-role-dropdown-arrow]");
      const highlight = root.querySelector<HTMLElement>("[data-role-dropdown-highlight]");
      const items = gsap.utils.toArray<HTMLElement>("[data-role-dropdown-item]", root);

      if (!menu || !arrow || !highlight) {
        return;
      }

      gsap.set(menu, {
        autoAlpha: 0,
        pointerEvents: "none",
        scale: 0.7,
        transformOrigin: "50% 0%",
        yPercent: -30,
      });
      gsap.set(arrow, { rotation: 0, transformOrigin: "50% 50%" });
      gsap.set(highlight, { autoAlpha: 0, height: 0, y: 0 });
      gsap.set(items, { opacity: 1, x: 0 });

      if (shouldReduceMotion()) {
        timelineRef.current = null;
        return;
      }

      const timeline = gsap.timeline({
        onReverseComplete: () => {
          gsap.set(menu, { pointerEvents: "none" });
        },
        paused: true,
      });

      timeline
        .set(menu, { pointerEvents: "auto" }, 0)
        .to(
          arrow,
          {
            duration: 0.9,
            ease: "elastic.out(1.2, 0.3)",
            easeReverse: "power2.inOut",
            rotation: 180,
          },
          0,
        )
        .to(
          menu,
          {
            autoAlpha: 1,
            duration: 1,
            ease: "elastic.out(1.2, 0.3)",
            easeReverse: "power3.out",
            scale: 1,
            yPercent: 0,
          },
          0,
        )
        .from(
          items,
          {
            duration: 0.5,
            ease: "back.out(3)",
            easeReverse: "power2.out",
            opacity: 0,
            stagger: 0.07,
            x: -20,
          },
          0.1,
        );

      timelineRef.current = timeline;

      return () => {
        timelineRef.current = null;
      };
    },
    { scope: rootRef },
  );

  const syncReducedState = contextSafe((nextOpen: boolean) => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const menu = root.querySelector<HTMLElement>("[data-role-dropdown-menu]");
    const arrow = root.querySelector<HTMLElement>("[data-role-dropdown-arrow]");
    const highlight = root.querySelector<HTMLElement>("[data-role-dropdown-highlight]");
    const items = gsap.utils.toArray<HTMLElement>("[data-role-dropdown-item]", root);

    gsap.set(menu, {
      autoAlpha: nextOpen ? 1 : 0,
      pointerEvents: nextOpen ? "auto" : "none",
      scale: 1,
      yPercent: 0,
    });
    gsap.set(arrow, { rotation: nextOpen ? 180 : 0 });
    gsap.set(highlight, { autoAlpha: 0, height: 0, y: 0 });
    gsap.set(items, { opacity: 1, x: 0 });
  });

  const moveOptionHighlight = contextSafe((target: HTMLElement) => {
    const root = rootRef.current;
    const highlight = root?.querySelector<HTMLElement>("[data-role-dropdown-highlight]");

    if (!highlight) {
      return;
    }

    const edgeCompensation = 1;

    gsap.to(highlight, {
      autoAlpha: 1,
      duration: shouldReduceMotion() ? 0 : 0.28,
      ease: "power3.out",
      height: target.offsetHeight + edgeCompensation,
      overwrite: true,
      y: Math.max(0, target.offsetTop - edgeCompensation),
    });
  });

  const hideOptionHighlight = contextSafe(() => {
    const highlight = rootRef.current?.querySelector<HTMLElement>("[data-role-dropdown-highlight]");

    if (!highlight) {
      return;
    }

    gsap.to(highlight, {
      autoAlpha: 0,
      duration: shouldReduceMotion() ? 0 : 0.16,
      ease: "power2.out",
      overwrite: true,
    });
  });

  const setDropdownOpen = contextSafe((nextOpen: boolean) => {
    setIsOpen(nextOpen);

    if (shouldReduceMotion()) {
      syncReducedState(nextOpen);
      return;
    }

    const timeline = timelineRef.current;

    if (!timeline) {
      return;
    }

    if (nextOpen) {
      timeline.timeScale(1).play();
      return;
    }

    timeline.timeScale(roleDropdownExitTimeScale).reverse();
  });

  const selectRole = contextSafe((nextValue: ColumnRole) => {
    onChange(nextValue);
    hideOptionHighlight();
    setDropdownOpen(false);
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      setDropdownOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setDropdownOpen]);

  return (
    <div className="relative inline-block w-full" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Role for ${columnLabel}`}
        className="learning-grid-control flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-6 py-3 text-left text-base font-medium text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 [@media_(min-width:2200px)]:min-h-24 [@media_(min-width:2200px)]:px-7 [@media_(min-width:2200px)]:py-3.5 [@media_(min-width:2200px)]:text-lg"
        onClick={() => setDropdownOpen(!isOpen)}
        type="button"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDownIcon
          aria-hidden="true"
          className="block size-4 shrink-0 text-current [@media_(min-width:2200px)]:size-5"
          data-role-dropdown-arrow
        />
      </button>

      <div
        aria-hidden={!isOpen}
        aria-label={`Role options for ${columnLabel}`}
        className="learning-grid-control invisible absolute top-[calc(100%+10px)] right-0 left-0 z-40 w-full origin-top overflow-hidden text-neutral-700 opacity-0 will-change-transform [@media_(min-width:2200px)]:top-[calc(100%+12px)]"
        data-role-dropdown-menu
        id={menuId}
        onPointerLeave={hideOptionHighlight}
        role="listbox"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 left-0 z-0 bg-emerald-500 opacity-0"
          data-role-dropdown-highlight
        />
        {roleOptions.map((option) => (
          <button
            aria-selected={value === option.value}
            className="relative z-10 block w-full cursor-pointer border-b learning-grid-border px-5 py-3 text-left text-base font-medium text-neutral-700 last:border-b-0 hover:text-neutral-50 focus-visible:text-neutral-50 focus-visible:outline-none [@media_(min-width:2200px)]:px-6 [@media_(min-width:2200px)]:py-4 [@media_(min-width:2200px)]:text-lg"
            data-role-dropdown-item
            key={option.value}
            onFocus={(event) => moveOptionHighlight(event.currentTarget)}
            onClick={() => selectRole(option.value)}
            onPointerEnter={(event) => moveOptionHighlight(event.currentTarget)}
            role="option"
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
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
      <div className="learning-sheet-cell col-span-full px-6 py-5 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:px-12 [@media_(min-width:2200px)]:py-8 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
        {exercise.instruction}
      </div>
      <div className="learning-sheet-cell col-span-full grid gap-4 p-6 [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:p-12">
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
                Column ID: {column.id}
              </span>
            </span>
            <RoleDropdown
              columnLabel={column.label}
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
  exercise,
  onToggleOption,
  selectedOptionIds,
}: {
  exercise: MultipleChoiceExercise;
  onToggleOption: (optionId: string) => void;
  selectedOptionIds: string[];
}) {
  return (
    <div className="learning-sheet-cell col-span-full grid gap-4 p-6 [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:p-12">
      {exercise.options.map((option) => (
        <label
          className="flex min-h-24 cursor-pointer items-center gap-4 border learning-grid-border p-5 [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:p-6"
          key={option.id}
        >
          <input
            checked={selectedOptionIds.includes(option.id)}
            className="size-5 accent-emerald-500 [@media_(min-width:2200px)]:size-6"
            onChange={() => onToggleOption(option.id)}
            type="checkbox"
          />
          <span className="text-base leading-7 text-foreground [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
            {option.label}
          </span>
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
    <ol className="learning-sheet-cell col-span-full grid gap-4 p-6 [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:p-12">
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
                aria-label={`Move ${step.label} up`}
                className="learning-grid-panel-fill inline-flex size-12 cursor-pointer items-center justify-center text-foreground disabled:cursor-not-allowed disabled:opacity-40 [@media_(min-width:2200px)]:size-24"
                disabled={index === 0}
                onClick={() => onMoveStep(index, -1)}
                type="button"
              >
                <ArrowUpIcon
                  aria-hidden="true"
                  className="size-5 [@media_(min-width:2200px)]:size-6"
                />
              </button>
              <button
                aria-label={`Move ${step.label} down`}
                className="learning-grid-panel-fill inline-flex size-12 cursor-pointer items-center justify-center text-foreground disabled:cursor-not-allowed disabled:opacity-40 [@media_(min-width:2200px)]:size-24"
                disabled={index === orderedStepIds.length - 1}
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
  return (
    <div
      aria-live="polite"
      className="learning-sheet-cell col-span-full flex gap-4 p-6 [@media_(min-width:2200px)]:gap-5 [@media_(min-width:2200px)]:p-12"
    >
      {result.status === "correct" ? (
        <CheckCircleIcon
          aria-hidden="true"
          className="size-7 shrink-0 text-emerald-500 [@media_(min-width:2200px)]:size-8"
        />
      ) : (
        <InformationCircleIcon
          aria-hidden="true"
          className="size-7 shrink-0 text-sky-600 [@media_(min-width:2200px)]:size-8"
        />
      )}
      <div>
        <h2 className="text-xl font-semibold text-foreground [@media_(min-width:2200px)]:text-3xl">
          {result.title}
        </h2>
        <p className="mt-3 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:mt-4 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
          {result.message}
        </p>
        <p className="mt-3 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:mt-4 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
          {result.nextStep}
        </p>
        {result.status !== "correct" && result.missedColumnIds.length > 0 ? (
          <div className="learning-grid-panel-fill mt-5 p-5 [@media_(min-width:2200px)]:mt-7 [@media_(min-width:2200px)]:p-6">
            <p className="text-base font-semibold text-foreground [@media_(min-width:2200px)]:text-lg">
              Expected role check
            </p>
            <ul className="mt-3 grid gap-1.5 text-base leading-7 text-muted-foreground [@media_(min-width:2200px)]:mt-4 [@media_(min-width:2200px)]:text-lg [@media_(min-width:2200px)]:leading-8">
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
  );
}
