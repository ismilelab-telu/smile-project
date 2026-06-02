import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  authStorageKey,
  clearAuthSession,
  storeAuthSession,
  type AuthSession,
} from "@/features/auth/auth-session";
import { inspectGuidedDownloadArchiveWithBackend } from "./learning-backend";

function seedAuthSession(partial: Partial<AuthSession> = {}) {
  storeAuthSession({
    accessToken: "access-token",
    expiresAt: Date.now() + 60 * 60 * 1000,
    idToken: "id-token",
    refreshToken: "refresh-token",
    user: {
      email: "student@example.com",
      initials: "ST",
      name: "Student",
      sub: "student-1",
    },
    ...partial,
  });
}

describe("learning backend auth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubEnv("VITE_LEARNING_BACKEND_URL", "https://backend.example.test");
    clearAuthSession();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("does not create a guest upload request without a signed-in session", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await expect(
      inspectGuidedDownloadArchiveWithBackend(new File(["zip"], "dataset.zip")),
    ).rejects.toThrow("Sign in before using this lesson backend.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the Cognito authorization header without a guest id", async () => {
    seedAuthSession();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            contentType: "application/zip",
            objectKey: "uploads/student-1/upload/dataset.zip",
            uploadUrl: "https://uploads.example.test/dataset.zip",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tabularFilePath: "data/dataset.csv",
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetch);

    await inspectGuidedDownloadArchiveWithBackend(new File(["zip"], "dataset.zip"));

    expect(fetch).toHaveBeenCalledTimes(3);
    const presignRequest = fetch.mock.calls[0]?.[1] as RequestInit;
    const inspectRequest = fetch.mock.calls[2]?.[1] as RequestInit;

    expect(presignRequest.headers).toMatchObject({ authorization: "Bearer id-token" });
    expect(JSON.parse(String(presignRequest.body))).not.toHaveProperty("guestId");
    expect(inspectRequest.headers).toMatchObject({ authorization: "Bearer id-token" });
    expect(JSON.parse(String(inspectRequest.body))).not.toHaveProperty("guestId");
  });

  it("refreshes a stale token before sending guided backend requests", async () => {
    seedAuthSession({
      expiresAt: Date.now() - 1000,
      idToken: "expired-id-token",
    });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authenticationResult: {
              AccessToken: "fresh-access-token",
              ExpiresIn: 3600,
              IdToken: "fresh-id-token",
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            contentType: "application/zip",
            objectKey: "uploads/student-1/upload/dataset.zip",
            uploadUrl: "https://uploads.example.test/dataset.zip",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tabularFilePath: "data/dataset.csv",
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetch);

    await inspectGuidedDownloadArchiveWithBackend(new File(["zip"], "dataset.zip"));

    expect(fetch).toHaveBeenCalledTimes(4);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/session/refresh");
    expect(String(fetch.mock.calls[0]?.[0])).not.toContain("cognito-idp.");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      refreshToken: "refresh-token",
      userSub: "student-1",
    });

    const presignRequest = fetch.mock.calls[1]?.[1] as RequestInit;
    const inspectRequest = fetch.mock.calls[3]?.[1] as RequestInit;

    expect(presignRequest.headers).toMatchObject({ authorization: "Bearer fresh-id-token" });
    expect(inspectRequest.headers).toMatchObject({ authorization: "Bearer fresh-id-token" });
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();

    expect(window.sessionStorage.getItem(authStorageKey)).toBeNull();
  });
});
