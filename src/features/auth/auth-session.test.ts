import { beforeEach, describe, expect, it } from "vitest";

import {
  authStorageKey,
  clearAuthSession,
  getStoredAuthSession,
  storeAuthSession,
  type AuthSession,
} from "./auth-session";

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

describe("auth session storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("stores tokens in session storage instead of local storage", () => {
    const session = createSession();

    storeAuthSession(session);

    const storedSession = JSON.parse(window.sessionStorage.getItem(authStorageKey) ?? "{}");

    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
    expect(storedSession).toMatchObject({
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      idToken: session.idToken,
      user: session.user,
    });
    expect(storedSession).not.toHaveProperty("refreshToken");
    expect(getStoredAuthSession()).toEqual(session);
  });

  it("migrates and removes a legacy local storage session", () => {
    const session = createSession();

    window.localStorage.setItem(authStorageKey, JSON.stringify(session));

    expect(getStoredAuthSession()).toEqual(session);
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();

    const storedSession = JSON.parse(window.sessionStorage.getItem(authStorageKey) ?? "{}");

    expect(storedSession).toMatchObject({
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      idToken: session.idToken,
      user: session.user,
    });
    expect(storedSession).not.toHaveProperty("refreshToken");
  });

  it("clears both current and legacy auth storage", () => {
    const session = createSession();

    window.localStorage.setItem(authStorageKey, JSON.stringify(session));
    window.sessionStorage.setItem(authStorageKey, JSON.stringify(session));

    clearAuthSession();

    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
    expect(window.sessionStorage.getItem(authStorageKey)).toBeNull();
  });
});
