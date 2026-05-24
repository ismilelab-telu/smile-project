export type ColumnRole = "target" | "safe-feature" | "metadata" | "ignore";

export type LearningLessonStatus = "not_started" | "in_progress" | "completed";

export type EvaluationStatus = "correct" | "partial" | "incorrect";
export type ExerciseType = "multiple-choice" | "ordered-steps" | "table-column-role-assignment";

export type DatasetColumn = {
  id: string;
  label: string;
  role: ColumnRole;
  type: "numeric" | "categorical" | "boolean" | "text";
  unit?: string;
};

export type DatasetRow = {
  id: string;
  values: Record<string, string | number | boolean | null>;
};

export type DatasetView = {
  id: string;
  title: string;
  columnIds: string[];
  rowIds: string[];
};

export type GeneratedDataset = {
  id: string;
  version: string;
  title: string;
  description: string;
  columns: DatasetColumn[];
  rows: DatasetRow[];
  views: DatasetView[];
};

type LessonExerciseBase = {
  id: string;
  type: ExerciseType;
  prompt: string;
  hints: string[];
};

export type TableColumnRoleExercise = LessonExerciseBase & {
  type: "table-column-role-assignment";
  datasetContext: string;
  instruction: string;
};

export type ChoiceExerciseOption = {
  id: string;
  label: string;
};

export type MultipleChoiceExercise = LessonExerciseBase & {
  type: "multiple-choice";
  options: ChoiceExerciseOption[];
  correctOptionIds: string[];
};

export type OrderedStep = {
  id: string;
  label: string;
};

export type OrderedStepsExercise = LessonExerciseBase & {
  type: "ordered-steps";
  steps: OrderedStep[];
  correctStepIds: string[];
};

export type LessonExercise =
  | MultipleChoiceExercise
  | OrderedStepsExercise
  | TableColumnRoleExercise;

export type Lesson = {
  id: string;
  moduleId: string;
  title: string;
  numberLabel: string;
  estimatedMinutes: number;
  objective: string;
  summary: string[];
  datasetId?: string;
  viewId?: string;
  exerciseId: string;
  exercise: LessonExercise;
  exercises?: LessonExercise[];
};

export type LearningModule = {
  id: string;
  title: string;
  summary: string;
  lessonIds: string[];
  status: "available" | "locked";
};

export type LearningTrack = {
  id: string;
  title: string;
  moduleIds: string[];
  status: "available" | "coming-soon";
};

export type ExerciseAttempt = {
  exerciseId: string;
  status: EvaluationStatus;
  score: number;
  submittedAt: string;
};

export type LessonAnswer = {
  columnRoleAssignmentsByExerciseId?: Record<string, Record<string, ColumnRole>>;
  orderedStepIdsByExerciseId?: Record<string, string[]>;
  selectedOptionIdsByExerciseId?: Record<string, string[]>;
};

export type LearningProgress = {
  version: 1;
  completedLessonIds: string[];
  attempts: Record<string, ExerciseAttempt>;
  lessonAnswers: Record<string, LessonAnswer>;
  currentLessonId?: string;
};

export type EvaluationResult = {
  status: EvaluationStatus;
  score: number;
  title: string;
  message: string;
  nextStep: string;
  missedColumnIds: string[];
  extraColumnIds: string[];
};
