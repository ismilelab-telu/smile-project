import { beforeEach, describe, expect, it, vi } from "vitest";

import { authStorageKey } from "@/features/auth/auth-session";
import { inspectGuidedDownloadArchiveWithBackend } from "./learning-backend";

function seedAuthSession() {
  window.localStorage.setItem(
    authStorageKey,
    JSON.stringify({
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
    }),
  );
}

describe("learning backend auth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
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
});
