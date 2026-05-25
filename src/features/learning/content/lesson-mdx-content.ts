import type { ComponentType } from "react";

import WhatIsMachineLearningContent from "./mdx/0-1-what-is-machine-learning.mdx";

export const lessonMdxContentById: Partial<Record<string, ComponentType>> = {
  "lesson-0-1-what-is-machine-learning": WhatIsMachineLearningContent,
};
