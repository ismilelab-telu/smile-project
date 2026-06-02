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
    clearAuthSession();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("keeps the auth session in memory and clears browser storage", () => {
    const session = createSession();

    storeAuthSession(session);

    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
    expect(window.sessionStorage.getItem(authStorageKey)).toBeNull();
    expect(getStoredAuthSession()).toEqual(session);
  });

  it("clears a legacy local storage session instead of hydrating bearer tokens", () => {
    const session = createSession();

    window.localStorage.setItem(authStorageKey, JSON.stringify(session));

    expect(getStoredAuthSession()).toBeNull();
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
    expect(window.sessionStorage.getItem(authStorageKey)).toBeNull();
  });

  it("clears malformed auth storage instead of hydrating it", () => {
    window.sessionStorage.setItem(authStorageKey, "{bad json");
    window.localStorage.setItem(authStorageKey, JSON.stringify(createSession()));

    expect(getStoredAuthSession()).toBeNull();
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
    expect(window.sessionStorage.getItem(authStorageKey)).toBeNull();
  });

  it("does not restore a tokenless stored session snapshot after reload", () => {
    window.sessionStorage.setItem(
      authStorageKey,
      JSON.stringify({
        expiresAt: Date.now() + 60 * 60 * 1000,
        user: {
          email: "student@example.com",
          initials: "ST",
          name: "Student",
          sub: "student-1",
        },
      }),
    );

    expect(getStoredAuthSession()).toBeNull();
    expect(window.sessionStorage.getItem(authStorageKey)).toBeNull();
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
