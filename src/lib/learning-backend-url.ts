type ViteImportMeta = ImportMeta & {
  env?: {
    VITE_LEARNING_BACKEND_URL?: string;
  };
};

export function getLearningBackendUrl() {
  const url = (import.meta as ViteImportMeta).env?.VITE_LEARNING_BACKEND_URL?.trim() ?? "";

  if (!url) {
    throw new Error("Learning backend URL is not configured.");
  }

  return url.replace(/\/+$/, "");
}
