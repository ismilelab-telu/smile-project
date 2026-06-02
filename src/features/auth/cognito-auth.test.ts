import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  confirmPasswordResetWithCognito,
  confirmSignUpWithCognito,
  requestPasswordResetWithCognito,
  refreshCognitoSession,
  signInWithCognito,
  signInWithUsername,
  signUpWithCognito,
} from "./cognito-auth";

function createJwt(payload: Record<string, unknown>) {
  const encodedPayload = window
    .btoa(JSON.stringify(payload))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

  return `header.${encodedPayload}.signature`;
}

describe("backend-owned sign-up", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_LEARNING_BACKEND_URL", "https://backend.example.test");
  });

  it("starts sign-up through the learning backend", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          CodeDeliveryDetails: {
            Destination: "s***t@example.com",
          },
          UserConfirmed: false,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    const result = await signUpWithCognito({
      email: "student@example.com",
      name: "student_one",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/sign-up/start");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      email: "student@example.com",
      name: "student_one",
    });
    expect(result.CodeDeliveryDetails?.Destination).toBe("s***t@example.com");
    expect(result.UserConfirmed).toBe(false);
  });

  it("confirms sign-up through the learning backend with the password", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await confirmSignUpWithCognito({
      code: "123456",
      email: "student@example.com",
      password: "StrongPass1!",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/confirmation/confirm");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      code: "123456",
      email: "student@example.com",
      password: "StrongPass1!",
    });
  });
});

describe("username sign-in", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_LEARNING_BACKEND_URL", "https://backend.example.test");
  });

  it("signs in through the backend without receiving the account email", async () => {
    const idToken = createJwt({
      email: "student@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
      name: "Student One",
      sub: "student-1",
    });
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          authenticationResult: {
            AccessToken: "access-token",
            ExpiresIn: 3600,
            IdToken: idToken,
            RefreshToken: "refresh-token",
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    const session = await signInWithUsername({
      password: "StrongPass1!",
      username: "student_one",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/username/sign-in");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      password: "StrongPass1!",
      username: "student_one",
    });
    expect(session.user.email).toBe("student@example.com");
  });
});

describe("email sign-in", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_LEARNING_BACKEND_URL", "https://backend.example.test");
  });

  it("signs in through the backend so public auth rate limits apply", async () => {
    const idToken = createJwt({
      email: "student@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
      name: "Student One",
      sub: "student-1",
    });
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          authenticationResult: {
            AccessToken: "access-token",
            ExpiresIn: 3600,
            IdToken: idToken,
            RefreshToken: "refresh-token",
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    const session = await signInWithCognito({
      email: "student@example.com",
      password: "StrongPass1!",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/email/sign-in");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      email: "student@example.com",
      password: "StrongPass1!",
    });
    expect(session.user.sub).toBe("student-1");
  });
});

describe("password reset", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_LEARNING_BACKEND_URL", "https://backend.example.test");
  });

  it("requests and confirms a password reset through the backend", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            CodeDeliveryDetails: {
              Destination: "s***t@example.com",
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    const requestResult = await requestPasswordResetWithCognito("student@example.com");
    await confirmPasswordResetWithCognito({
      code: "123456",
      email: "student@example.com",
      password: "StrongPass1!",
    });

    expect(requestResult.CodeDeliveryDetails?.Destination).toBe("s***t@example.com");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/password-reset/request");
    const forgotPasswordBody = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as {
      email?: string;
    };
    expect(forgotPasswordBody).toMatchObject({
      email: "student@example.com",
    });
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({ "content-type": "application/json" });
    expect(String(fetch.mock.calls[1]?.[0])).toContain("/auth/password-reset/confirm");
    const confirmForgotPasswordBody = JSON.parse(String(fetch.mock.calls[1]?.[1]?.body)) as {
      code?: string;
      email?: string;
      password?: string;
    };
    expect(confirmForgotPasswordBody).toMatchObject({
      code: "123456",
      email: "student@example.com",
      password: "StrongPass1!",
    });
    expect(fetch.mock.calls[1]?.[1]?.headers).toMatchObject({ "content-type": "application/json" });
  });
});

describe("session refresh", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_LEARNING_BACKEND_URL", "https://backend.example.test");
  });

  it("refreshes through the backend instead of calling Cognito directly", async () => {
    const refreshedIdToken = createJwt({
      email: "student@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
      name: "Student One",
      sub: "student-1",
    });
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          authenticationResult: {
            AccessToken: "fresh-access-token",
            ExpiresIn: 3600,
            IdToken: refreshedIdToken,
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    const session = await refreshCognitoSession({
      accessToken: "access-token",
      expiresAt: Date.now() - 1000,
      idToken: "expired-id-token",
      refreshToken: "refresh-token",
      user: {
        email: "student@example.com",
        initials: "SO",
        name: "Student One",
        sub: "student-1",
      },
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/session/refresh");
    expect(String(fetch.mock.calls[0]?.[0])).not.toContain("cognito-idp.");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      refreshToken: "refresh-token",
      userSub: "student-1",
    });
    expect(session.idToken).toBe(refreshedIdToken);
    expect(session.refreshToken).toBe("refresh-token");
  });
});
