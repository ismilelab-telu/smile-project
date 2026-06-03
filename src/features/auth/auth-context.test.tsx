import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./auth-context";
import {
  authStorageKey,
  clearAuthSession,
  storeAuthSession,
  type AuthSession,
} from "./auth-session";
import { authRefreshSkewMs } from "./auth-session-refresh";

function createJwt(payload: Record<string, unknown>) {
  const encodedPayload = window
    .btoa(JSON.stringify(payload))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

  return `header.${encodedPayload}.signature`;
}

function createSession(partial: Partial<AuthSession> = {}): AuthSession {
  const expiresAt = Date.now() + 60 * 60 * 1000;

  return {
    accessToken: "access-token",
    expiresAt,
    idToken: createJwt({
      email: "student@example.com",
      exp: Math.floor(expiresAt / 1000),
      name: "Student",
      sub: "student-1",
    }),
    refreshToken: "",
    user: {
      email: "student@example.com",
      initials: "ST",
      name: "Student",
      sub: "student-1",
    },
    ...partial,
  };
}

function AuthProbe() {
  const auth = useAuth();

  return (
    <>
      <output data-ready={auth.isReady} data-token={auth.session?.idToken ?? ""} role="status">
        {auth.isAuthenticated ? "authenticated" : "signed-out"}
      </output>
      <button onClick={auth.signOut} type="button">
        Sign out
      </button>
    </>
  );
}

describe("AuthProvider token lifecycle", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    clearAuthSession();
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.stubEnv("VITE_LEARNING_BACKEND_URL", "https://backend.example.test");
  });

  it("refreshes an open session before the Cognito token expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-02T00:00:00.000Z"));

    const initialExpiresAt = Date.now() + 10 * 60 * 1000;
    const refreshedExpiresAt = Date.now() + 70 * 60 * 1000;
    const refreshedIdToken = createJwt({
      email: "student@example.com",
      exp: Math.floor(refreshedExpiresAt / 1000),
      name: "Student",
      sub: "student-1",
    });

    storeAuthSession(
      createSession({
        expiresAt: initialExpiresAt,
        idToken: createJwt({
          email: "student@example.com",
          exp: Math.floor(initialExpiresAt / 1000),
          name: "Student",
          sub: "student-1",
        }),
      }),
    );

    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          authenticationResult: {
            AccessToken: "refreshed-access-token",
            ExpiresIn: 3600,
            IdToken: refreshedIdToken,
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("status")).toHaveAttribute("data-ready", "true");
    expect(fetch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000 - authRefreshSkewMs);
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/session/refresh");
    expect(String(fetch.mock.calls[0]?.[0])).not.toContain("cognito-idp.");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toMatchObject({
      userSub: "student-1",
    });
    expect(screen.getByRole("status")).toHaveAttribute("data-token", refreshedIdToken);
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();

    expect(window.sessionStorage.getItem(authStorageKey)).toBeNull();
  });

  it("bootstraps a session after reload from the backend refresh cookie", async () => {
    const bootstrappedExpiresAt = Date.now() + 70 * 60 * 1000;
    const bootstrappedIdToken = createJwt({
      email: "student@example.com",
      exp: Math.floor(bootstrappedExpiresAt / 1000),
      name: "Student",
      sub: "student-1",
    });
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          authenticationResult: {
            AccessToken: "bootstrapped-access-token",
            ExpiresIn: 3600,
            IdToken: bootstrappedIdToken,
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveAttribute("data-ready", "true");
    });

    expect(screen.getByRole("status")).toHaveTextContent("authenticated");
    expect(screen.getByRole("status")).toHaveAttribute("data-token", bootstrappedIdToken);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/session/bootstrap");
    expect(fetch.mock.calls[0]?.[1]?.credentials).toBe("same-origin");
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
    expect(window.sessionStorage.getItem(authStorageKey)).toBeNull();
  });

  it("does not restore a session when logout wins an in-flight refresh", async () => {
    let resolveRefresh: ((response: Response) => void) | null = null;
    const refreshedExpiresAt = Date.now() + 70 * 60 * 1000;
    const refreshedIdToken = createJwt({
      email: "student@example.com",
      exp: Math.floor(refreshedExpiresAt / 1000),
      name: "Student",
      sub: "student-1",
    });

    storeAuthSession(
      createSession({
        expiresAt: Date.now() - 1000,
        idToken: createJwt({
          email: "student@example.com",
          exp: Math.floor((Date.now() - 1000) / 1000),
          name: "Student",
          sub: "student-1",
        }),
      }),
    );

    const fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/auth/session/refresh")) {
        return new Promise<Response>((resolve) => {
          resolveRefresh = resolve;
        });
      }

      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetch);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/session/refresh"),
        expect.anything(),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    resolveRefresh?.(
      new Response(
        JSON.stringify({
          authenticationResult: {
            AccessToken: "refreshed-access-token",
            ExpiresIn: 3600,
            IdToken: refreshedIdToken,
          },
        }),
        { status: 200 },
      ),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveAttribute("data-ready", "true");
    });

    expect(screen.getByRole("status")).toHaveTextContent("signed-out");
    expect(screen.getByRole("status")).toHaveAttribute("data-token", "");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/session/revoke"),
      expect.anything(),
    );
  });
});
