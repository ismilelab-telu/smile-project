import { beforeEach, describe, expect, it, vi } from "vitest";

import { confirmSignUpWithCognito, signUpWithCognito } from "./cognito-auth";

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
      password: "Password1",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/auth/sign-up/start");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      email: "student@example.com",
      name: "student_one",
      password: "Password1",
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
