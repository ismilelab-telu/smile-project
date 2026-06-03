import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  bootstrapCognitoSession,
  confirmPasswordResetWithCognito,
  confirmSignUpWithCognito,
  requestPasswordResetWithCognito,
  refreshCognitoSession,
  resendConfirmationCodeWithCognito,
  revokeSession,
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
      locale: "en",
      name: "student_one",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/sign-up/start");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      email: "student@example.com",
      locale: "en",
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

  it("resends sign-up codes with the active locale", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await resendConfirmationCodeWithCognito({
      email: "student@example.com",
      locale: "en",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/confirmation/resend");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      email: "student@example.com",
      locale: "en",
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
    expect(session.refreshToken).toBe("");
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
    expect(session.refreshToken).toBe("");
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

    const requestResult = await requestPasswordResetWithCognito({
      email: "student@example.com",
      locale: "en",
    });
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
      locale?: string;
    };
    expect(forgotPasswordBody).toMatchObject({
      email: "student@example.com",
      locale: "en",
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
      refreshToken: "legacy-refresh-token",
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
      userSub: "student-1",
    });
    expect(fetch.mock.calls[0]?.[1]?.credentials).toBe("same-origin");
    expect(session.idToken).toBe(refreshedIdToken);
    expect(session.refreshToken).toBe("");
  });

  it("revokes through the backend refresh cookie without sending refresh tokens in JSON", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await revokeSession();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/session/revoke");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({});
    expect(fetch.mock.calls[0]?.[1]?.credentials).toBe("same-origin");
  });

  it("surfaces failed refresh-cookie revocation to callers", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "SessionRevokeFailed",
          message: "Session revoke failed.",
        }),
        { status: 503 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(revokeSession()).rejects.toMatchObject({
      code: "SessionRevokeFailed",
      message: "Session revoke failed.",
    });
  });

  it("bootstraps a session from the backend refresh cookie", async () => {
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
            AccessToken: "fresh-access-token",
            ExpiresIn: 3600,
            IdToken: idToken,
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);

    const session = await bootstrapCognitoSession();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/session/bootstrap");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({});
    expect(fetch.mock.calls[0]?.[1]?.credentials).toBe("same-origin");
    expect(session.accessToken).toBe("fresh-access-token");
    expect(session.refreshToken).toBe("");
  });
});
