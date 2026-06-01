type ViteImportMeta = ImportMeta & {
  env?: {
    VITE_LEARNING_BACKEND_URL?: string;
  };
};

const defaultLearningBackendUrl =
  "https://zr2esakjqcpiypbnq257nml72e0wjaco.lambda-url.ap-southeast-1.on.aws";

export function getLearningBackendUrl() {
  return (
    (import.meta as ViteImportMeta).env?.VITE_LEARNING_BACKEND_URL ?? defaultLearningBackendUrl
  )
    .trim()
    .replace(/\/+$/, "");
}
