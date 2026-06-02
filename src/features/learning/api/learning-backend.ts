import type { AuthSession } from "@/features/auth/auth-session";
import { getFreshStoredAuthSession } from "@/features/auth/auth-session-refresh";
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

type LearningBackendAuthOptions = {
  getFreshSession?: (options?: { force?: boolean }) => Promise<AuthSession | null>;
};

export async function readLearningBackendJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { message?: string };

  if (!response.ok) {
    throw new Error(body.message ?? "Learning backend request failed.");
  }

  return body as T;
}

async function postLearningBackendJson<T>(
  path: string,
  body: unknown,
  options: LearningBackendAuthOptions = {},
): Promise<T> {
  let authorization = await getLearningBackendAuthorizationHeader(options);

  if (!authorization) {
    throw new Error("Sign in before using this lesson backend.");
  }

  const requestBody = JSON.stringify(body);
  let response = await fetch(`${getLearningBackendUrl()}${path}`, {
    body: requestBody,
    headers: {
      authorization,
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (response.status === 401) {
    authorization = await getLearningBackendAuthorizationHeader(options, { force: true });

    if (authorization) {
      response = await fetch(`${getLearningBackendUrl()}${path}`, {
        body: requestBody,
        headers: {
          authorization,
          "content-type": "application/json",
        },
        method: "POST",
      });
    }
  }

  return readLearningBackendJson<T>(response);
}

async function getLearningBackendAuthorizationHeader(
  options: LearningBackendAuthOptions,
  refreshOptions: { force?: boolean } = {},
) {
  const session = options.getFreshSession
    ? await options.getFreshSession(refreshOptions)
    : await getFreshStoredAuthSession(refreshOptions);

  return session ? `Bearer ${session.idToken}` : "";
}

export async function inspectGuidedDownloadArchiveWithBackend(
  file: File,
  options: LearningBackendAuthOptions = {},
) {
  const contentType = file.type || "application/zip";
  const presign = await postLearningBackendJson<LearningBackendPresignResponse>(
    "/uploads/presign",
    {
      contentType,
      fileName: file.name,
    },
    options,
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
    options,
  );

  if (!inspection.tabularFilePath) {
    throw new Error("Learning backend did not return a CSV path.");
  }

  return {
    objectKey: presign.objectKey,
    tabularFilePath: inspection.tabularFilePath,
  };
}

export async function validateGuidedDownloadCodeWithBackend(
  {
    code,
    extractedFilePath,
    objectKey,
  }: {
    code: string;
    extractedFilePath: string;
    objectKey: string;
  },
  options: LearningBackendAuthOptions = {},
) {
  return postLearningBackendJson<LearningBackendValidationResponse>(
    "/pandas/validate",
    {
      code,
      csvPath: extractedFilePath,
      objectKey,
    },
    options,
  );
}
