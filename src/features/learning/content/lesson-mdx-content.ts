import type { ComponentType } from "react";

import WhatIsMachineLearningContent from "./mdx/0-1-what-is-machine-learning.mdx";
import MachineLearningInAiContent from "./mdx/0-2-machine-learning-in-ai.mdx";
import CoreComponentsContent from "./mdx/0-3-core-components.mdx";
import LearningTypesContent from "./mdx/0-4-learning-types.mdx";
import MachineLearningUseCasesContent from "./mdx/0-5-machine-learning-use-cases.mdx";
import FormulatingMachineLearningProblemsContent from "./mdx/0-6-formulating-machine-learning-problems.mdx";
import MlToolsAndLibrariesContent from "./mdx/1-1-ml-tools-and-libraries.mdx";
import DataCollectingContent from "./mdx/1-2-data-collecting.mdx";
import DataLoadingContent from "./mdx/1-3-data-loading.mdx";
import CleaningTransformationContent from "./mdx/1-4-cleaning-and-transformation.mdx";
import ExploratoryExplanatoryAnalysisContent from "./mdx/1-5-exploratory-and-explanatory-data-analysis.mdx";
import DataSplittingContent from "./mdx/1-6-data-splitting.mdx";
import ModelingContent from "./mdx/1-7-modeling.mdx";

export const lessonMdxContentById: Partial<Record<string, ComponentType>> = {
  "lesson-0-1-what-is-machine-learning": WhatIsMachineLearningContent,
  "lesson-0-2-machine-learning-in-ai": MachineLearningInAiContent,
  "lesson-0-3-core-components": CoreComponentsContent,
  "lesson-0-4-learning-types": LearningTypesContent,
  "lesson-0-5-machine-learning-use-cases": MachineLearningUseCasesContent,
  "lesson-0-6-formulating-ml-problems": FormulatingMachineLearningProblemsContent,
  "lesson-1-1-ml-tools-libraries": MlToolsAndLibrariesContent,
  "lesson-1-2-data-collecting": DataCollectingContent,
  "lesson-1-3-data-loading": DataLoadingContent,
  "lesson-1-4-cleaning-transformation": CleaningTransformationContent,
  "lesson-1-5-exploratory-explanatory-analysis": ExploratoryExplanatoryAnalysisContent,
  "lesson-1-6-data-splitting": DataSplittingContent,
  "lesson-1-7-modeling": ModelingContent,
};
