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
import { useEffect, useId, useMemo, useRef, useState, type ComponentPropsWithoutRef } from "react";

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
import { GlassSurface } from "@/components/ui/glass-surface";
import { LiquidButton, LiquidLink } from "@/components/ui/liquid-button";
import { shouldReduceMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

const liquidButtonClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-neutral-50 backdrop-blur-xl shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.16),0_12px_32px_oklch(0%_0_0_/_0.22)] [--liquid-button-background-color:oklch(100%_0_0_/_0.08)] [--liquid-button-color:var(--color-emerald-500)]";

const glassCardStyle = {
  inset: 0,
  pointerEvents: "none",
  position: "absolute",
  zIndex: -1,
} as const;

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
      <main className="relative z-10 isolate min-h-screen overflow-x-hidden text-foreground">
        <LearningHeader backHref="/learn" backLabel="Back to Learning Home" />
        <LessonGlassCard className="route-content-transition-target mx-auto mt-20 max-w-lg p-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">Lesson cannot be opened</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The dataset view for this lesson is not available yet.
          </p>
          <LiquidLink className={`${liquidButtonClassName} mt-5`} data-app-link href="/learn">
            Back to Learning Home
          </LiquidLink>
        </LessonGlassCard>
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
    <main className="relative z-10 isolate min-h-screen overflow-x-hidden text-foreground">
      <LearningHeader backHref="/learn" backLabel="Back to Learning Home" />

      <div className="route-content-transition-target mx-auto grid w-[min(1180px,calc(100%_-_32px))] gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
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

          <LessonGlassCard aria-labelledby="concept-summary" className="p-5">
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
          </LessonGlassCard>

          {lesson.exercise.type === "table-column-role-assignment" && datasetView ? (
            <DatasetPreview exercise={lesson.exercise} datasetView={datasetView} />
          ) : null}

          <LessonGlassCard aria-labelledby="exercise" className="p-0">
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
          </LessonGlassCard>

          {result ? <LessonResult result={result} /> : null}
        </article>

        <aside className="flex h-fit flex-col gap-4">
          <LessonGlassCard className="p-5">
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
          </LessonGlassCard>

          <LessonGlassCard className="p-5">
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
          </LessonGlassCard>
        </aside>
      </div>
    </main>
  );
}

function LessonGlassCard({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section {...props} className={`relative isolate overflow-hidden rounded-3xl ${className}`}>
      <GlassSurface
        aria-hidden="true"
        backgroundOpacity={0.08}
        borderRadius={24}
        brightness={24}
        height="100%"
        opacity={0.55}
        saturation={1.6}
        style={glassCardStyle}
        width="100%"
      />
      {children}
    </section>
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
    <LessonGlassCard aria-labelledby="dataset-preview" className="p-0">
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
    </LessonGlassCard>
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
      const items = gsap.utils.toArray<HTMLElement>("[data-role-dropdown-item]", root);

      if (!menu || !arrow) {
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
    const items = gsap.utils.toArray<HTMLElement>("[data-role-dropdown-item]", root);

    gsap.set(menu, {
      autoAlpha: nextOpen ? 1 : 0,
      pointerEvents: nextOpen ? "auto" : "none",
      scale: 1,
      yPercent: 0,
    });
    gsap.set(arrow, { rotation: nextOpen ? 180 : 0 });
    gsap.set(items, { opacity: 1, x: 0 });
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
        className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border-2 border-neutral-500 bg-neutral-900 px-5 py-2 text-left text-[0.85rem] font-medium text-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        onClick={() => setDropdownOpen(!isOpen)}
        type="button"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDownIcon
          aria-hidden="true"
          className="block size-3 shrink-0 text-current"
          data-role-dropdown-arrow
        />
      </button>

      <div
        aria-hidden={!isOpen}
        aria-label={`Role options for ${columnLabel}`}
        className="invisible absolute top-[calc(100%+8px)] right-0 left-0 z-40 w-full origin-top overflow-hidden rounded-lg border-2 border-neutral-500 bg-neutral-900 text-neutral-300 opacity-0 shadow-[0_18px_50px_oklch(0%_0_0_/_0.34)] will-change-transform"
        data-role-dropdown-menu
        id={menuId}
        role="listbox"
      >
        {roleOptions.map((option) => (
          <button
            aria-selected={value === option.value}
            className="block w-full cursor-pointer border-b border-white/5 px-4 py-[9px] text-left text-[0.82rem] font-medium text-neutral-300 last:border-b-0 hover:bg-emerald-400/10 hover:text-neutral-50 focus-visible:bg-emerald-400/10 focus-visible:text-neutral-50 focus-visible:outline-none"
            data-role-dropdown-item
            key={option.value}
            onClick={() => selectRole(option.value)}
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
      <p className="border-b border-border px-5 py-4 text-sm leading-6 text-muted-foreground">
        {exercise.instruction}
      </p>
      <div className="grid gap-3 p-5">
        {columns.map((column) => (
          <div
            className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center"
            key={column.id}
          >
            <span>
              <span className="block text-sm font-semibold text-foreground">{column.label}</span>
              <span className="mt-1 block text-sm text-muted-foreground">
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
    <LessonGlassCard aria-live="polite" className="p-5">
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
    </LessonGlassCard>
  );
}
