import { getAuthAuthorizationHeader } from "@/features/auth/auth-session";
import { getLearningBackendUrl } from "@/lib/learning-backend-url";
import type { CodeDiagnostic } from "../components/pandas-code-editor-utils";

export { getLearningBackendUrl };

type LearningBackendPresignResponse = {
  contentType?: string;
  objectKey?: string;
  uploadUrl?: string;
};

type LearningBackendInspectResponse = {
  csvPath?: string;
  expectedCode?: string;
  tabularFilePath?: string;
};

export type LearningBackendValidationResponse = {
  columns?: string[];
  diagnostics?: CodeDiagnostic[];
  expectedCode?: string;
  message?: string;
  previewRows?: string[][];
  score?: number;
  status?: string;
  tabularFilePath?: string;
};

export async function readLearningBackendJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { message?: string };

  if (!response.ok) {
    throw new Error(body.message ?? "Learning backend request failed.");
  }

  return body as T;
}

async function postLearningBackendJson<T>(path: string, body: unknown): Promise<T> {
  const authorization = getAuthAuthorizationHeader();

  if (!authorization) {
    throw new Error("Sign in before using this lesson backend.");
  }

  const response = await fetch(`${getLearningBackendUrl()}${path}`, {
    body: JSON.stringify(body),
    headers: {
      authorization,
      "content-type": "application/json",
    },
    method: "POST",
  });

  return readLearningBackendJson<T>(response);
}

export async function inspectGuidedDownloadArchiveWithBackend(file: File) {
  const contentType = file.type || "application/zip";
  const presign = await postLearningBackendJson<LearningBackendPresignResponse>(
    "/uploads/presign",
    {
      contentType,
      fileName: file.name,
    },
  );

  if (!presign.objectKey || !presign.uploadUrl) {
    throw new Error("Learning backend did not return an upload URL.");
  }

  const uploadResponse = await fetch(presign.uploadUrl, {
    body: file,
    headers: {
      "content-type": presign.contentType || contentType,
    },
    method: "PUT",
  });

  if (!uploadResponse.ok) {
    throw new Error("ZIP upload failed.");
  }

  const inspection = await postLearningBackendJson<LearningBackendInspectResponse>(
    "/datasets/inspect",
    {
      objectKey: presign.objectKey,
    },
  );

  if (!inspection.tabularFilePath) {
    throw new Error("Learning backend did not return a CSV path.");
  }

  return {
    objectKey: presign.objectKey,
    tabularFilePath: inspection.tabularFilePath,
  };
}

export async function validateGuidedDownloadCodeWithBackend({
  code,
  extractedFilePath,
  objectKey,
}: {
  code: string;
  extractedFilePath: string;
  objectKey: string;
}) {
  return postLearningBackendJson<LearningBackendValidationResponse>("/pandas/validate", {
    code,
    csvPath: extractedFilePath,
    objectKey,
  });
}
