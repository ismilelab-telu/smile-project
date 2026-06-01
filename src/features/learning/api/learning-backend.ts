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

const learningBackendGuestIdStorageKey = "smile-learning-backend-guest-id-v1";
const learningBackendGuestIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/;

export async function readLearningBackendJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { message?: string };

  if (!response.ok) {
    throw new Error(body.message ?? "Learning backend request failed.");
  }

  return body as T;
}

async function postLearningBackendJson<T>(path: string, body: unknown): Promise<T> {
  const authorization = getAuthAuthorizationHeader();
  const requestBody = authorization ? body : addLearningBackendGuestId(body);
  const response = await fetch(`${getLearningBackendUrl()}${path}`, {
    body: JSON.stringify(requestBody),
    headers: {
      ...(authorization ? { authorization } : {}),
      "content-type": "application/json",
    },
    method: "POST",
  });

  return readLearningBackendJson<T>(response);
}

function addLearningBackendGuestId(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }

  return {
    ...(body as Record<string, unknown>),
    guestId: getLearningBackendGuestId(),
  };
}

function getLearningBackendGuestId() {
  if (typeof window === "undefined") {
    return createLearningBackendGuestId();
  }

  const storedGuestId = window.localStorage.getItem(learningBackendGuestIdStorageKey);
  if (storedGuestId && learningBackendGuestIdPattern.test(storedGuestId)) {
    return storedGuestId;
  }

  const guestId = createLearningBackendGuestId();
  window.localStorage.setItem(learningBackendGuestIdStorageKey, guestId);

  return guestId;
}

function createLearningBackendGuestId() {
  const cryptoApi = globalThis.crypto;
  const randomPart =
    typeof cryptoApi?.randomUUID === "function"
      ? cryptoApi.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return `guest_${randomPart.replace(/[^A-Za-z0-9_-]/g, "")}`.slice(0, 128);
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
