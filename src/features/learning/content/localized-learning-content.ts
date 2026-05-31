import type { Locale } from "@/features/localization/localization";
import type {
  DatasetColumn,
  DatasetRow,
  DatasetView,
  GeneratedDataset,
  GuidedDownloadExercise,
  LearningModule,
  LearningTrack,
  Lesson,
  LessonExercise,
  MultipleChoiceExercise,
  OpenDatasetSourceExercise,
  OrderedStepsExercise,
  TableColumnRoleExercise,
} from "../types";
import { getLearningExerciseHints } from "./learning-hint-glossary";

type ExerciseCopy = {
  codeLabel?: string;
  codePlaceholder?: string;
  datasetContext?: string;
  introParagraphs?: string[];
  introTitle?: string;
  instruction?: string;
  missingSourceMessage?: string;
  notesLabel?: string;
  options?: Record<string, string>;
  prompt?: string;
  sourceLinkLabel?: string;
  sourceInputs?: Record<
    string,
    {
      description?: string;
      label?: string;
      notesPlaceholder?: string;
      urlPlaceholder?: string;
    }
  >;
  steps?: Record<string, string>;
  taskDescription?: string;
  taskSteps?: string[];
  taskTitle?: string;
  uploadDescription?: string;
  uploadLabel?: string;
  urlLabel?: string;
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
        options: {
          "customer-segments": "Group customers based on purchase patterns.",
          "detect-risk": "Detect risky transactions from previous transaction patterns.",
          "fixed-alarm": "Turn on an alarm at the same time every day.",
          "fixed-total": "Calculate checkout total with price multiplied by quantity.",
          "forecast-demand":
            "Predict food delivery time from distance, weather, traffic, and vehicle type.",
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
        options: {
          "actual-demand-feature":
            "The best feature is the actual delivery time we want to predict.",
          "clear-statement":
            "A clear problem statement is to predict food delivery duration from order and delivery context.",
          "regression-task":
            "The sensible problem type is regression because the output is a number.",
          "safe-features":
            "Safe features can include distance, weather, traffic, time of day, vehicle type, preparation time, and courier experience.",
          "target-demand": "A sensible target is delivery time in minutes.",
        },
        prompt:
          "A food delivery team wants to estimate how many minutes an order will take to reach the customer. Which choices correctly formulate the ML problem?",
      },
      "exercise-0-6-select-feature-target": {
        datasetContext:
          "The food delivery team wants to predict order delivery time in minutes from delivery context.",

        instruction: "Choose one target, safe features, and metadata from the table.",
        prompt: "Choose the target and features from the food delivery table.",
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
        options: {
          "baseline-with-scikit-learn": "Set a simple Scikit-learn benchmark.",
          "deep-learning-first": "Jump to TensorFlow because the output is numeric.",
          "inspect-with-pandas": "Audit samples, column types, and blanks with Pandas.",
          "skip-data-check": "Try modeling first and explore data later.",
          "start-notebook": "Keep the experiment trail in a notebook.",
          "visualize-before-modeling": "Read the target pattern with quick charts.",
        },
        prompt:
          "A food delivery team needs an initial model to estimate delivery time from order data. Which early decisions are healthiest?",
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
        options: {
          "capture-source": "Record source origin, data period, and collection method.",
          "check-permission": "Check permission, privacy, and field-use limits.",
          "check-representation":
            "Make sure distance, weather, traffic, time of day, vehicle type, and couriers are represented.",
          "collect-everything": "Grab as many columns as possible; decide the goal later.",
          "define-question": "Set the prediction output, row unit, and data coverage.",
          "single-segment": "Use the easiest source even if its segment is narrow.",
        },
        prompt:
          "A food delivery team wants to estimate delivery time from order data. Which early decisions are healthiest?",
      },
      "exercise-1-2-open-source-data-search": {
        introParagraphs: [
          "For early practice, we do not always need to create a dataset from scratch. Many learning projects use open datasets from public platforms so we can focus on understanding the problem, data structure, and data quality.",
          "Open datasets still need inspection. A dataset that is easy to download is not automatically a good fit, especially when the target, features, period, or usage permission is unclear.",
        ],
        introTitle: "Collecting Data from Open Sources",
        notesLabel: "About dataset",
        prompt: "Validate an open dataset for the food delivery time prediction case.",
        sourceInputs: {
          "demand-source": {
            description: "",
            label: "Food delivery dataset",
            notesPlaceholder:
              "This will be filled automatically from the dataset page if readable. If not, write the About Dataset summary here.",
            urlPlaceholder: "https://www.kaggle.com/datasets/creator-name/dataset-name",
          },
        },
        taskDescription: "Follow these steps, then paste the dataset link into the field below.",
        taskSteps: [
          "Open [Kaggle](https://www.kaggle.com/).",
          "In the sidebar, choose Data Hub > Datasets.",
          "Open Filters.",
          "Type linear regression, then click Apply.",
          "In the search field, type food deliv.",
          "Choose the top result that is relevant to food delivery time prediction.",
          "Copy the dataset page link, then paste it into the Dataset link field.",
          "If the link is valid, the About dataset field will be filled automatically from the dataset page.",
        ],
        taskTitle: "Search task",
        urlLabel: "Dataset link",
      },
    },
    objective:
      "You can define data needs, sources, permission, and early checks for an ML project.",
    summary: [
      "Data collection determines whether the model learns from examples that are relevant, sufficient, safe, and contextualized.",
      "Data sources can be internal, external, synthetic, or user-generated; each source needs permission, coverage, and risk checks.",
      "Before using data, preserve context and do early validation so bias, missing fields, or usage limits are not found too late.",
    ],
    title: "Data Collecting",
  },
  "lesson-1-3-data-loading": {
    exerciseCopies: {
      "exercise-1-3-data-loading": {
        options: {
          "check-schema": "Check column names, data types, and expected fields.",
          "preview-rows": "Preview a few rows before working further.",
          "read-into-table": "Read the data source into a table or dataframe.",
          "train-immediately": "Train a model immediately after opening the file.",
        },
        prompt: "After a dataset is chosen, which actions belong in data loading?",
      },
      "exercise-1-3-kaggle-zip-loading": {
        codeLabel: "Pandas code",
        codePlaceholder: 'import pandas as pd\n\ndf = pd.read_csv("data/file-name.csv")\ndf.head()',
        introParagraphs: [
          "Now use the dataset you chose earlier. We are not cleaning or modeling yet; this exercise only makes sure the raw Kaggle file is ready on your machine.",
          "Kaggle usually provides datasets as ZIP files. Keep the ZIP first, because the next step is choosing the tabular file to load into a DataFrame.",
        ],
        introTitle: "Downloading a Kaggle Dataset ZIP",
        missingSourceMessage:
          "The Kaggle dataset link from Lesson 1.2 was not found. Complete and submit the source-data exercise first so the link can appear here.",
        prompt: "Upload the Kaggle ZIP, then write Pandas code to load the extracted CSV.",
        sourceLinkLabel: "Dataset link from Lesson 1.2",
        taskDescription:
          "Use the link below so you do not need to return to the previous lesson. After the ZIP is uploaded, the system will read the ZIP contents and prepare the CSV path for the Pandas code.",
        taskSteps: [
          "Open the Kaggle dataset link you submitted.",
          "On the Kaggle page, click Download to download the dataset as a ZIP file.",
          "Upload the ZIP file to this exercise so the CSV inside it can be read behind the scenes.",
          "Type the Pandas code shown as the placeholder, then submit your answer.",
        ],
        taskTitle: "Download task",
        uploadDescription: "Upload the ZIP downloaded from Kaggle.",
        uploadLabel: "Upload dataset ZIP",
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
    courier_experience_yrs: { label: "Courier Experience", unit: "yrs" },
    delivery_time_min: { label: "Delivery Time", unit: "min" },
    distance_km: { label: "Distance", unit: "km" },
    order_id: { label: "Order ID" },
    preparation_time_min: { label: "Preparation Time", unit: "min" },
    time_of_day: { label: "Time of Day" },
    traffic_level: { label: "Traffic Level" },
    vehicle_type: { label: "Vehicle Type" },
    weather: { label: "Weather" },
  } satisfies Record<string, Partial<DatasetColumn>>,
  description:
    "Fictional food delivery dataset based on the Food Delivery Time Prediction structure for learning features and targets.",
  rows: {
    time_of_day: {
      malam: "night",
      pagi: "morning",
      siang: "afternoon",
      sore: "evening",
    },
    traffic_level: {
      rendah: "low",
      sedang: "medium",
      tinggi: "high",
    },
    vehicle_type: {
      mobil: "car",
      sepeda: "bike",
      skuter: "scooter",
    },
    weather: {
      berangin: "windy",
      berkabut: "foggy",
      bersalju: "snowy",
      cerah: "sunny",
      hujan: "rainy",
    },
  },
  title: "Food Delivery Time Intro",
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
    hints: getLearningExerciseHints(exercise.id, "en", exercise.hints),
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

  if (exercise.type === "open-dataset-source") {
    return {
      ...baseExercise,
      introParagraphs: copy.introParagraphs ?? exercise.introParagraphs,
      introTitle: copy.introTitle ?? exercise.introTitle,
      notesLabel: copy.notesLabel ?? exercise.notesLabel,
      sourceInputs: exercise.sourceInputs.map((sourceInput) => ({
        ...sourceInput,
        description: copy.sourceInputs?.[sourceInput.id]?.description ?? sourceInput.description,
        label: copy.sourceInputs?.[sourceInput.id]?.label ?? sourceInput.label,
        notesPlaceholder:
          copy.sourceInputs?.[sourceInput.id]?.notesPlaceholder ?? sourceInput.notesPlaceholder,
        urlPlaceholder:
          copy.sourceInputs?.[sourceInput.id]?.urlPlaceholder ?? sourceInput.urlPlaceholder,
      })),
      taskDescription: copy.taskDescription ?? exercise.taskDescription,
      taskSteps: copy.taskSteps ?? exercise.taskSteps,
      taskTitle: copy.taskTitle ?? exercise.taskTitle,
      urlLabel: copy.urlLabel ?? exercise.urlLabel,
    } satisfies OpenDatasetSourceExercise;
  }

  if (exercise.type === "guided-download") {
    return {
      ...baseExercise,
      codeLabel: copy.codeLabel ?? exercise.codeLabel,
      codePlaceholder: copy.codePlaceholder ?? exercise.codePlaceholder,
      introParagraphs: copy.introParagraphs ?? exercise.introParagraphs,
      introTitle: copy.introTitle ?? exercise.introTitle,
      missingSourceMessage: copy.missingSourceMessage ?? exercise.missingSourceMessage,
      sourceLinkLabel: copy.sourceLinkLabel ?? exercise.sourceLinkLabel,
      taskDescription: copy.taskDescription ?? exercise.taskDescription,
      taskSteps: copy.taskSteps ?? exercise.taskSteps,
      taskTitle: copy.taskTitle ?? exercise.taskTitle,
      uploadDescription: copy.uploadDescription ?? exercise.uploadDescription,
      uploadLabel: copy.uploadLabel ?? exercise.uploadLabel,
    } satisfies GuidedDownloadExercise;
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
