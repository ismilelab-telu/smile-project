import type { Locale } from "@/features/localization/localization";
import type {
  DatasetColumn,
  DatasetRow,
  DatasetView,
  GeneratedDataset,
  LearningModule,
  LearningTrack,
  Lesson,
  LessonExercise,
  MultipleChoiceExercise,
  OrderedStepsExercise,
  TableColumnRoleExercise,
} from "../types";

type ExerciseCopy = {
  datasetContext?: string;
  hints?: string[];
  instruction?: string;
  options?: Record<string, string>;
  prompt?: string;
  steps?: Record<string, string>;
};

type LessonCopy = {
  exerciseCopies?: Record<string, ExerciseCopy>;
  objective?: string;
  summary?: string[];
  title?: string;
};

const englishTrackCopyById: Record<string, Pick<LearningTrack, "title">> = {
  "track-classification": { title: "Classification" },
  "track-clustering": { title: "Clustering" },
  "track-machine-learning-foundations": { title: "Machine Learning Foundations" },
  "track-regression": { title: "Regression" },
};

const englishModuleCopyById: Record<string, Pick<LearningModule, "summary" | "title">> = {
  "module-0-workflow-foundations": {
    summary:
      "Understand what machine learning is, where it sits in AI, and how to formulate a clear ML problem.",
    title: "Hi, Machine Learning!",
  },
  "module-1-data-understanding": {
    summary:
      "Move from tools and data collection into loading, cleaning, analysis, splitting, and modeling.",
    title: "Machine Learning Workflow",
  },
};

const englishLessonCopyById: Record<string, LessonCopy> = {
  "lesson-0-1-what-is-machine-learning": {
    exerciseCopies: {
      "exercise-0-1-what-is-machine-learning": {
        hints: [
          "Look for the answer that mentions learning from data.",
          "Machine learning does not guarantee every answer will be correct.",
          "A model needs examples before it can learn useful patterns.",
        ],
        options: {
          "always-correct":
            "The computer always produces correct answers because it already uses artificial intelligence.",
          "learn-from-data":
            "The computer learns patterns from data so it can make predictions, recommendations, or decisions for new examples.",
          "manual-rules-only":
            "The computer runs a fixed list of rules written by humans for every condition.",
          "no-data-needed":
            "The computer does not need data because the model already knows the pattern from the start.",
        },
        prompt: "Which statement best explains machine learning?",
      },
    },
    objective: "You can explain machine learning as a system that learns patterns from data.",
    summary: [
      "Machine learning is an approach inside artificial intelligence that lets computers learn from data.",
      "Instead of writing a rule for every condition, we provide examples, data, and a goal so the system can find patterns.",
      "Machine learning is useful when patterns are too numerous, too changeable, or too hard to write as complete manual rules.",
    ],
    title: "What Is Machine Learning",
  },
  "lesson-0-2-machine-learning-in-ai": {
    exerciseCopies: {
      "exercise-0-2-machine-learning-in-ai": {
        hints: [
          "AI is the larger umbrella.",
          "Machine learning learns from data.",
          "Generative AI is related to creating new content.",
        ],
        options: {
          "ai-ml-same": "AI and machine learning are exactly the same thing.",
          "dl-all-ai": "Deep learning always means every kind of AI without exception.",
          "gen-ai-no-content": "Generative AI can only group data; it cannot create new content.",
          "ml-part-of-ai": "Machine learning is part of AI and learns from data.",
        },
        prompt: "Which statement is the most accurate?",
      },
    },
    objective: "You can place machine learning inside the broader AI map.",
    summary: [
      "Artificial intelligence is the broad umbrella for systems that perform tasks usually associated with human intelligence.",
      "Machine learning is the part of AI that lets systems learn from data.",
      "Neural networks, deep learning, and generative AI are part of the modern AI map, but they are not all the same thing as machine learning.",
    ],
    title: "Machine Learning in AI",
  },
  "lesson-0-3-core-components": {
    exerciseCopies: {
      "exercise-0-3-core-components": {
        hints: [
          "A model needs both a goal and data.",
          "Training is the learning process.",
          "Evaluation checks that the model is not only good on early examples.",
        ],
        options: {
          data: "Data as examples to learn from.",
          evaluation: "Evaluation to judge whether the model is useful.",
          guessing: "Guessing the result without data because the model always knows the answer.",
          model: "A model that learns patterns from data.",
          problem: "The problem or task to solve.",
          training: "Training to adjust the model.",
        },
        prompt: "Which items are basic components of machine learning?",
      },
    },
    objective: "You can recognize the basic components in a machine learning project.",
    summary: [
      "Machine learning is not only choosing an algorithm. A project starts from a clear problem.",
      "Data provides examples, a model learns patterns, training adjusts the model, and prediction applies the model to new examples.",
      "Evaluation checks whether the model actually helps and does not only look good on early examples.",
    ],
    title: "Core Components of Machine Learning",
  },
  "lesson-0-4-learning-types": {
    exerciseCopies: {
      "exercise-0-4-learning-types": {
        hints: [
          "Numbers point to regression.",
          "Categories point to classification.",
          "Groups without answer labels point to clustering.",
          "Actions and rewards point to reinforcement learning.",
        ],
        options: {
          "classification-category": "Classification predicts categories.",
          "clustering-groups": "Clustering groups data without answer labels.",
          "regression-number": "Regression predicts numeric values.",
          "rl-reward": "Reinforcement learning learns from rewards for actions.",
          "unsupervised-target": "Unsupervised learning always needs a known correct target.",
        },
        prompt: "Which pairs are correct?",
      },
    },
    objective: "You can distinguish the main types of machine learning at a map level.",
    summary: [
      "Supervised learning uses examples that already have answers. Regression predicts numbers, while classification predicts categories.",
      "Unsupervised learning uses data without targets to find structure, such as clustering.",
      "Reinforcement learning trains an agent to choose actions based on rewards.",
    ],
    title: "Types of Machine Learning",
  },
  "lesson-0-5-machine-learning-use-cases": {
    exerciseCopies: {
      "exercise-0-5-machine-learning-use-cases": {
        hints: [
          "Look for problems that need patterns learned from data.",
          "Simple rules do not always need ML.",
          "Prediction and risk detection often fit ML when data is available.",
        ],
        options: {
          "customer-segments": "Group customers based on purchase patterns.",
          "detect-risk": "Detect risky transactions from previous transaction patterns.",
          "fixed-alarm": "Turn on an alarm at the same time every day.",
          "fixed-total": "Calculate checkout total with price multiplied by quantity.",
          "forecast-demand":
            "Predict tomorrow's order volume from sales history, weather, and promotions.",
        },
        prompt: "Which use cases make the most sense for machine learning?",
      },
    },
    objective: "You can recognize when machine learning is reasonable to use.",
    summary: [
      "Machine learning is strong when a problem has patterns that can be learned from examples.",
      "ML use cases often involve prediction, grouping, recommendations, risk detection, or prioritization.",
      "If a problem can be solved with a simple stable rule, machine learning may be unnecessary.",
    ],
    title: "Machine Learning Use Cases",
  },
  "lesson-0-6-formulating-ml-problems": {
    exerciseCopies: {
      "exercise-0-6-formulate-problem": {
        hints: [
          "The target is the output you want to predict.",
          "Features must be available before prediction time.",
          "A numeric output points to regression.",
        ],
        options: {
          "actual-demand-feature":
            "The best feature is the actual drink count, which is only known after the shift ends.",
          "clear-statement":
            "A clear problem statement is to predict drinks sold before the shift starts.",
          "regression-task":
            "The sensible problem type is regression because the output is a number.",
          "safe-features":
            "Safe features can include day, shift time, predicted weather, and promotions known before the shift.",
          "target-demand": "A sensible target is the number of drinks sold during the shift.",
        },
        prompt:
          "A cafe wants to estimate how many drinks to prepare before a shift starts. Which choices correctly formulate the ML problem?",
      },
      "exercise-0-6-select-feature-target": {
        datasetContext:
          "The cafe wants to predict how many drinks will be sold before the shift starts.",
        hints: [
          "The target is the output you want to predict.",
          "Features must be available before prediction time.",
          "An ID is usually metadata.",
          "Information only known after the event is not safe to use as a feature.",
        ],
        instruction: "Choose one target, safe features, metadata, and columns not used yet.",
        prompt: "Choose the target and features from the cafe shift table.",
      },
    },
    objective:
      "You can formulate an ML problem with a clear target, features, prediction time, and problem type.",
    summary: [
      "A good machine learning project starts with a clear problem and a clear output the model should produce.",
      "In supervised learning, the target is the value or category to predict, while features are the inputs used by the model.",
      "Features must be available when prediction happens. Information only known after the event is not safe as an input feature.",
    ],
    title: "Formulating Machine Learning Problems",
  },
  "lesson-1-1-ml-tools-libraries": {
    exerciseCopies: {
      "exercise-1-1-ml-tools-libraries": {
        hints: [
          "Look for choices that make data, assumptions, and early results auditable.",
          "Use tools by stage: exploration, data checks, visualization, then a model benchmark.",
          "A large model is not a shortcut around unread data.",
        ],
        options: {
          "baseline-with-scikit-learn": "Set a simple Scikit-learn benchmark.",
          "deep-learning-first": "Jump to TensorFlow because the output is numeric.",
          "inspect-with-pandas": "Audit samples, column types, and blanks with Pandas.",
          "skip-data-check": "Try modeling first and explore data later.",
          "start-notebook": "Keep the experiment trail in a notebook.",
          "visualize-before-modeling": "Read the target pattern with quick charts.",
        },
        prompt:
          "A cafe team needs an initial model to estimate next-shift stock from sales data. Which early decisions are healthiest?",
      },
    },
    objective: "You can recognize the role of basic tools in a machine learning workflow.",
    summary: [
      "Machine learning work usually combines an experiment environment, data tools, and modeling tools.",
      "Tools do not replace understanding. They help load data, inspect data, prepare data, train models, and evaluate results consistently.",
    ],
    title: "ML Tools and Libraries",
  },
  "lesson-1-2-data-collecting": {
    exerciseCopies: {
      "exercise-1-2-data-collecting": {
        hints: [
          "Data collection starts from the question the model should help answer.",
          "A dataset is easier to trust when its source is clear.",
          "Usage permission and privacy should be checked before data reaches a model.",
        ],
        options: {
          "capture-source": "Record the data source and when it was collected.",
          "check-permission": "Check whether the data can be used for the intended purpose.",
          "collect-everything": "Collect every column first, then decide the purpose later.",
          "define-question": "Define the prediction question before collecting columns.",
        },
        prompt: "Which choices make data collection useful for ML?",
      },
    },
    objective: "You can explain responsible data collection before modeling begins.",
    summary: [
      "Data collection is not just taking a file. It connects a real question with records that can answer it.",
      "Good data collection tracks source, timing, permission, and whether the fields match the prediction goal.",
    ],
    title: "Data Collecting",
  },
  "lesson-1-3-data-loading": {
    exerciseCopies: {
      "exercise-1-3-data-loading": {
        hints: [
          "Loading turns raw files, databases, or API responses into inspectable tables.",
          "Schema checks catch unexpected column names and data types.",
          "A quick preview can reveal obvious loading problems.",
        ],
        options: {
          "check-schema": "Check column names, data types, and expected fields.",
          "preview-rows": "Preview a few rows before working further.",
          "read-into-table": "Read the data source into a table or dataframe.",
          "train-immediately": "Train a model immediately after opening the file.",
        },
        prompt: "Which actions belong in data loading?",
      },
    },
    objective: "You can explain what to check when data is loaded into a project.",
    summary: [
      "Data loading brings raw data into a form the project can inspect.",
      "Before cleaning or modeling, make sure the table loaded correctly: rows exist, columns match expectations, and data types are not surprising.",
    ],
    title: "Data Loading",
  },
  "lesson-1-4-cleaning-transformation": {
    exerciseCopies: {
      "exercise-1-4-cleaning-transformation": {
        hints: [
          "Cleaning handles issues such as missing values and inconsistent labels.",
          "Transformation makes raw fields easier to analyze or model.",
          "Target leakage can appear when transformation is careless.",
        ],
        options: {
          "change-target-after-model":
            "Change the target definition after seeing which model wins.",
          "create-safe-fields":
            "Create transformed fields without using future target information.",
          "handle-missing": "Handle missing or impossible values with a clear reason.",
          "standardize-values": "Standardize inconsistent categories or formats.",
        },
        prompt: "Which actions belong in cleaning and transformation?",
      },
    },
    objective: "You can distinguish cleaning, transformation, and risky shortcuts.",
    summary: [
      "Cleaning makes the dataset more trustworthy by handling missing, inconsistent, duplicated, or impossible values.",
      "Transformation reshapes usable information into clearer fields while avoiding target leakage or future data leakage.",
    ],
    title: "Data Cleaning and Transformation",
  },
  "lesson-1-5-exploratory-explanatory-analysis": {
    exerciseCopies: {
      "exercise-1-5-exploratory-explanatory-analysis": {
        hints: [
          "Exploratory analysis helps discover patterns, issues, and follow-up questions.",
          "Explanatory analysis communicates findings clearly.",
          "Charts can support claims, but they do not automatically prove causation.",
        ],
        options: {
          "avoid-overclaiming": "Avoid making claims beyond the evidence.",
          "explain-findings": "Use explanatory analysis to communicate clear findings.",
          "explore-patterns": "Use exploratory analysis to look for patterns and issues.",
          "prove-causation": "Use one chart to prove the cause of every outcome.",
        },
        prompt: "Which statements describe exploratory and explanatory analysis?",
      },
    },
    objective: "You can distinguish exploration from explanation in data analysis.",
    summary: [
      "Exploratory analysis inspects distributions, relationships, gaps, and surprises.",
      "Explanatory analysis turns selected findings into clear communication with claims that match the evidence.",
    ],
    title: "Exploratory and Explanatory Data Analysis",
  },
  "lesson-1-6-data-splitting": {
    exerciseCopies: {
      "exercise-1-6-data-splitting": {
        hints: [
          "The test set should behave like unseen future data.",
          "Preprocessing that learns from data should be fitted on training data only.",
          "The split should still represent the real problem.",
        ],
        options: {
          "representative-split": "Check whether the split still represents the real problem.",
          "split-before-learning": "Split before fitting transformations or models.",
          "train-test-holdout": "Hold out test data to estimate performance on new data.",
          "tune-on-test": "Use test data repeatedly to choose every modeling decision.",
        },
        prompt: "Which choices make data splitting useful?",
      },
    },
    objective: "You can explain why and when data should be split.",
    summary: [
      "Data splitting protects evaluation from becoming too optimistic.",
      "Training data is used for learning. Test data is held back so the final result better reflects model behavior on new examples.",
    ],
    title: "Data Splitting",
  },
  "lesson-1-7-modeling": {
    exerciseCopies: {
      "exercise-1-7-modeling": {
        hints: [
          "A baseline gives the model a simple comparison point.",
          "Training adjusts model behavior based on training data.",
          "Evaluation checks errors and limitations, not only one score.",
        ],
        options: {
          "choose-baseline": "Compare the model with a simple baseline.",
          "complex-first": "Start with the most complex model and skip the baseline.",
          "evaluate-errors": "Evaluate errors, limitations, and whether the model helps.",
          "train-model": "Train a model using training data.",
        },
        prompt: "Which actions belong in modeling?",
      },
    },
    objective: "You can place modeling as one step in the broader ML workflow.",
    summary: [
      "Modeling is the stage where an algorithm learns patterns from training data.",
      "A good modeling step starts with a baseline, trains candidate models, then evaluates whether the model is useful for the problem.",
    ],
    title: "Modeling",
  },
};

const englishDatasetCopy = {
  columns: {
    day_part: { label: "Day Part" },
    drinks_sold: { label: "Drinks Sold", unit: "cups" },
    end_shift_revenue: { label: "End Shift Revenue", unit: "idr" },
    promo_active: { label: "Promo Active" },
    shift_id: { label: "Shift ID" },
    temperature_c: { label: "Temperature", unit: "deg_c" },
    weather: { label: "Weather" },
  } satisfies Record<string, Partial<DatasetColumn>>,
  description: "Fictional cafe shift dataset for learning features and targets.",
  rows: {
    day_part: {
      malam: "night",
      pagi: "morning",
      siang: "afternoon",
      sore: "evening",
    },
    weather: {
      berawan: "cloudy",
      cerah: "sunny",
      hujan: "rainy",
    },
  },
  title: "Smile Cafe Demand Intro",
};

function localizeExercise(
  exercise: LessonExercise,
  copy: ExerciseCopy | undefined,
): LessonExercise {
  if (!copy) {
    return exercise;
  }

  const baseExercise = {
    ...exercise,
    hints: copy.hints ?? exercise.hints,
    prompt: copy.prompt ?? exercise.prompt,
  };

  if (exercise.type === "multiple-choice") {
    return {
      ...baseExercise,
      options: exercise.options.map((option) => ({
        ...option,
        label: copy.options?.[option.id] ?? option.label,
      })),
    } satisfies MultipleChoiceExercise;
  }

  if (exercise.type === "ordered-steps") {
    return {
      ...baseExercise,
      steps: exercise.steps.map((step) => ({
        ...step,
        label: copy.steps?.[step.id] ?? step.label,
      })),
    } satisfies OrderedStepsExercise;
  }

  return {
    ...baseExercise,
    datasetContext: copy.datasetContext ?? exercise.datasetContext,
    instruction: copy.instruction ?? exercise.instruction,
  } satisfies TableColumnRoleExercise;
}

export function localizeTrack(track: LearningTrack, locale: Locale): LearningTrack {
  if (locale === "id") {
    return track;
  }

  return {
    ...track,
    ...englishTrackCopyById[track.id],
  };
}

export function localizeModule(module: LearningModule, locale: Locale): LearningModule {
  if (locale === "id") {
    return module;
  }

  return {
    ...module,
    ...englishModuleCopyById[module.id],
  };
}

export function localizeLesson(lesson: Lesson, locale: Locale): Lesson {
  if (locale === "id") {
    return lesson;
  }

  const copy = englishLessonCopyById[lesson.id];

  if (!copy) {
    return lesson;
  }

  const exerciseCopies = copy.exerciseCopies ?? {};
  const localizedExercises = (lesson.exercises ?? [lesson.exercise]).map((exercise) =>
    localizeExercise(exercise, exerciseCopies[exercise.id]),
  );

  return {
    ...lesson,
    objective: copy.objective ?? lesson.objective,
    summary: copy.summary ?? lesson.summary,
    title: copy.title ?? lesson.title,
    exercise: localizedExercises[0] ?? lesson.exercise,
    exercises: lesson.exercises ? localizedExercises : undefined,
  };
}

function localizeDatasetCellValue(columnId: string, value: DatasetRow["values"][string]) {
  if (typeof value !== "string") {
    return value;
  }

  if (columnId === "day_part") {
    return (
      englishDatasetCopy.rows.day_part[value as keyof typeof englishDatasetCopy.rows.day_part] ??
      value
    );
  }

  if (columnId === "weather") {
    return (
      englishDatasetCopy.rows.weather[value as keyof typeof englishDatasetCopy.rows.weather] ??
      value
    );
  }

  return value;
}

export function localizeDatasetView<
  T extends
    | { columns: DatasetColumn[]; dataset: GeneratedDataset; rows: DatasetRow[]; view: DatasetView }
    | undefined,
>(datasetView: T, locale: Locale): T {
  if (locale === "id" || !datasetView) {
    return datasetView;
  }

  return {
    ...datasetView,
    columns: datasetView.columns.map((column) => ({
      ...column,
      ...englishDatasetCopy.columns[column.id],
    })),
    dataset: {
      ...datasetView.dataset,
      description: englishDatasetCopy.description,
      title: englishDatasetCopy.title,
    },
    rows: datasetView.rows.map((row) => ({
      ...row,
      values: Object.fromEntries(
        Object.entries(row.values).map(([columnId, value]) => [
          columnId,
          localizeDatasetCellValue(columnId, value),
        ]),
      ),
    })),
  } as T;
}
