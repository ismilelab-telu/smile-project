import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { clearAuthSession, storeAuthSession, type AuthSession } from "@/features/auth/auth-session";
import type { LearningProgress } from "../types";
import {
  learningAccountProgressStorageKeyPrefix,
  learningProgressStorageKey,
  useLearningProgress,
} from "./learning-progress";

function createProgress(completedLessonIds: string[]): LearningProgress {
  return {
    attempts: {},
    completedLessonIds,
    lessonAnswers: {},
    submittedExerciseAnswers: {},
    version: 1,
  };
}

function createSession(partial: Partial<AuthSession> = {}): AuthSession {
  return {
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
  };
}

function getAccountProgressStorageKey(userId = "student-1") {
  return `${learningAccountProgressStorageKeyPrefix}${encodeURIComponent(userId)}`;
}

function ProgressProbe() {
  const auth = useAuth();
  const { progress } = useLearningProgress();

  return (
    <>
      <output role="status">{progress.completedLessonIds.join(",")}</output>
      <button onClick={() => void auth.signOut()} type="button">
        Sign out
      </button>
    </>
  );
}

function renderProgressProbe() {
  return render(
    <AuthProvider>
      <ProgressProbe />
    </AuthProvider>,
  );
}

describe("learning progress auth ownership", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubEnv("VITE_LEARNING_BACKEND_URL", "https://backend.example.test");
    clearAuthSession();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("merges guest progress into the signed-in account and clears the guest bucket after saving", async () => {
    window.localStorage.setItem(
      learningProgressStorageKey,
      JSON.stringify(createProgress(["guest-lesson"])),
    );
    storeAuthSession(createSession());

    let savedProgress: LearningProgress | null = null;
    const fetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        savedProgress = JSON.parse(String(init.body)).progress as LearningProgress;

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      return new Response(
        JSON.stringify({ progress: savedProgress ?? createProgress(["remote-lesson"]) }),
        {
          status: 200,
        },
      );
    });
    vi.stubGlobal("fetch", fetch);

    renderProgressProbe();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("remote-lesson,guest-lesson");
    });

    expect(String(fetch.mock.calls[0]?.[0])).toContain("/progress");
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ method: "GET" });
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({
      authorization: "Bearer access-token",
    });
    const saveCall = fetch.mock.calls.find((call) => call[1]?.method === "PUT");

    expect(saveCall?.[1]).toMatchObject({ method: "PUT" });
    expect(saveCall?.[1]?.headers).toMatchObject({
      authorization: "Bearer access-token",
    });
    expect(JSON.parse(String(saveCall?.[1]?.body))).toMatchObject({
      progress: {
        completedLessonIds: ["remote-lesson", "guest-lesson"],
      },
    });
    expect(window.localStorage.getItem(learningProgressStorageKey)).toBeNull();
    expect(
      JSON.parse(window.localStorage.getItem(getAccountProgressStorageKey()) ?? "{}"),
    ).toMatchObject({
      completedLessonIds: ["remote-lesson", "guest-lesson"],
    });
  });

  it("hides account progress and clears the local account cache after logout", async () => {
    storeAuthSession(createSession());

    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ progress: createProgress(["account-lesson"]) }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    renderProgressProbe();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("account-lesson");
    });
    expect(window.localStorage.getItem(getAccountProgressStorageKey())).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toBe("");
    });
    expect(window.localStorage.getItem(getAccountProgressStorageKey())).toBeNull();
    expect(window.localStorage.getItem(learningProgressStorageKey) ?? "").not.toContain(
      "account-lesson",
    );
  });
});
