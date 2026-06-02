import { beforeEach, describe, expect, it, vi } from "vitest";

import { confirmSignUpWithCognito, signInWithUsername, signUpWithCognito } from "./cognito-auth";

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
    vi.stubEnv("VITE_COGNITO_CLIENT_ID", "web-client");
    vi.stubEnv("VITE_COGNITO_REGION", "ap-southeast-1");
    vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "user-pool");
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
      password: "Password1",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/confirmation/confirm");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      code: "123456",
      email: "student@example.com",
      password: "Password1",
    });
  });
});

describe("username sign-in", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_COGNITO_CLIENT_ID", "web-client");
    vi.stubEnv("VITE_COGNITO_REGION", "ap-southeast-1");
    vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "user-pool");
  });

  it("resolves username through the backend without sending the password", async () => {
    const idToken = createJwt({
      email: "student@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
      name: "Student One",
      sub: "student-1",
    });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ email: "student@example.com" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            AuthenticationResult: {
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
      password: "Password1",
      username: "student_one",
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/username/resolve");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      username: "student_one",
    });
    expect(String(fetch.mock.calls[1]?.[0])).toBe(
      "https://cognito-idp.ap-southeast-1.amazonaws.com/",
    );
    const cognitoBody = JSON.parse(String(fetch.mock.calls[1]?.[1]?.body)) as {
      AuthParameters?: Record<string, string>;
      ClientId?: string;
    };
    expect(cognitoBody).toMatchObject({
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        PASSWORD: "Password1",
        USERNAME: "student@example.com",
      },
    });
    expect(cognitoBody.ClientId).toBeTruthy();
    expect(session.user.email).toBe("student@example.com");
  });
});
