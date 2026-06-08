import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearLearningBackendProxyRateLimitsForTests,
  handleLearningBackendProxyRequest,
} from "./learning-backend-proxy";

const trustedLearningBackendUrl = "https://backend.lambda-url.ap-southeast-1.on.aws";
const upstashRedisUrl = "https://redis.example.upstash.io";

type RedisCommandValue = number | string;

function createUpstashRedisProxyFetch() {
  const redisState = new Map<string, { expiresAt?: number; value: string }>();
  const redisRequests: Array<{ authorization: string | null; command: RedisCommandValue[] }> = [];
  const backendRequests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  const cleanupRedisState = () => {
    const now = Date.now();

    for (const [key, entry] of redisState.entries()) {
      if (entry.expiresAt !== undefined && entry.expiresAt <= now) {
        redisState.delete(key);
      }
    }
  };

  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) !== upstashRedisUrl) {
      backendRequests.push({ input, init });
      return new Response(JSON.stringify({ message: "backend" }), { status: 400 });
    }

    cleanupRedisState();

    const headers = new Headers(init?.headers);
    const command = JSON.parse(String(init?.body ?? "[]")) as RedisCommandValue[];
    const commandName = String(command[0] ?? "").toUpperCase();
    const key = String(command[1] ?? "");

    redisRequests.push({
      authorization: headers.get("authorization"),
      command,
    });

    if (commandName === "SET") {
      const hasNx = command.some((item) => String(item).toUpperCase() === "NX");
      const pxIndex = command.findIndex((item) => String(item).toUpperCase() === "PX");
      const ttlMs = pxIndex >= 0 ? Number(command[pxIndex + 1]) : 0;

      if (hasNx && redisState.has(key)) {
        return Response.json({ result: null });
      }

      redisState.set(key, {
        expiresAt: ttlMs > 0 ? Date.now() + ttlMs : undefined,
        value: String(command[2] ?? ""),
      });
      return Response.json({ result: "OK" });
    }

    if (commandName === "GET") {
      return Response.json({ result: redisState.get(key)?.value ?? null });
    }

    if (commandName === "INCR") {
      const entry = redisState.get(key);
      const value = String(Number(entry?.value ?? "0") + 1);

      redisState.set(key, { ...entry, value });
      return Response.json({ result: Number(value) });
    }

    if (commandName === "PEXPIRE") {
      const entry = redisState.get(key);
      if (!entry) {
        return Response.json({ result: 0 });
      }

      redisState.set(key, {
        ...entry,
        expiresAt: Date.now() + Number(command[2] ?? 0),
      });
      return Response.json({ result: 1 });
    }

    if (commandName === "PTTL") {
      const entry = redisState.get(key);
      if (!entry) {
        return Response.json({ result: -2 });
      }

      return Response.json({
        result: entry.expiresAt === undefined ? -1 : Math.max(0, entry.expiresAt - Date.now()),
      });
    }

    return Response.json({ result: null });
  });

  return { backendRequests, fetch, redisRequests };
}

describe("learning backend proxy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    clearLearningBackendProxyRateLimitsForTests();
  });

  it("forwards allowed backend requests with auth and original source headers", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json; charset=utf-8" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: `${trustedLearningBackendUrl}/`,
      },
      params: { path: ["progress"] },
      request: new Request("https://smile.test/api/learning-backend/progress?token=leaky", {
        headers: {
          authorization: "Bearer token",
          "cf-connecting-ip": "203.0.113.10",
        },
        method: "GET",
      }),
    });

    expect(response.status).toBe(200);
    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${trustedLearningBackendUrl}/progress`);

    const init = fetch.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;

    expect(headers.get("authorization")).toBe("Bearer token");
    expect(headers.get("cf-connecting-ip")).toBe("203.0.113.10");
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.10");
    expect(headers.get("x-smile-learning-backend-proxy-secret")).toBe("proxy-secret");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("ignores spoofable source headers when Cloudflare source is absent", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json; charset=utf-8" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["progress"] },
      request: new Request("https://smile.test/api/learning-backend/progress", {
        headers: {
          authorization: "Bearer token",
          "x-forwarded-for": "198.51.100.30",
          "x-real-ip": "198.51.100.31",
        },
        method: "GET",
      }),
    });

    expect(response.status).toBe(200);

    const init = fetch.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;

    expect(headers.get("cf-connecting-ip")).toBe("unknown");
    expect(headers.get("x-forwarded-for")).toBe("unknown");
  });

  it("does not forward bearer tokens from public auth requests", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ message: "backend" }), { status: 400 }));
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "email", "sign-in"] },
      request: new Request("https://smile.test/api/learning-backend/auth/email/sign-in", {
        body: JSON.stringify({ email: "student@example.com", password: "StrongPass1!" }),
        headers: {
          authorization: "Bearer stale-token",
          cookie: "__Host-smile-refresh-session=session-cookie; analytics=keep-me-local",
          "content-type": "application/json",
        },
        method: "POST",
      }),
    });

    expect(response.status).toBe(400);

    const init = fetch.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;

    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("cookie")).toBeNull();
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-smile-learning-backend-proxy-secret")).toBe("proxy-secret");
  });

  it("rate limits repeated public auth requests at the edge", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ message: "backend" }), { status: 400 }));
    vi.stubGlobal("fetch", fetch);

    const createRequest = () =>
      new Request("https://smile.test/api/learning-backend/auth/username/sign-in", {
        body: JSON.stringify({ password: "StrongPass1!", username: "student_one" }),
        headers: {
          "cf-connecting-ip": "203.0.113.20",
          "content-type": "application/json",
        },
        method: "POST",
      });

    const firstResponse = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "username", "sign-in"] },
      request: createRequest(),
    });
    const secondResponse = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "username", "sign-in"] },
      request: createRequest(),
    });

    expect(firstResponse.status).toBe(400);
    expect(secondResponse.status).toBe(429);
    expect(fetch).toHaveBeenCalledTimes(1);
    await expect(secondResponse.json()).resolves.toMatchObject({
      code: "AuthRateLimitExceededException",
    });
  });

  it("uses Upstash Redis for proxy auth rate limits when configured", async () => {
    const { backendRequests, fetch, redisRequests } = createUpstashRedisProxyFetch();
    vi.stubGlobal("fetch", fetch);

    const env = {
      LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
      LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      UPSTASH_REDIS_REST_TOKEN: "redis-token",
      UPSTASH_REDIS_REST_URL: upstashRedisUrl,
    };
    const createRequest = () =>
      new Request("https://smile.test/api/learning-backend/auth/username/sign-in", {
        body: JSON.stringify({ password: "StrongPass1!", username: "student_one" }),
        headers: {
          "cf-connecting-ip": "203.0.113.20",
          "content-type": "application/json",
        },
        method: "POST",
      });

    const firstResponse = await handleLearningBackendProxyRequest({
      env,
      params: { path: ["auth", "username", "sign-in"] },
      request: createRequest(),
    });
    clearLearningBackendProxyRateLimitsForTests();
    const secondResponse = await handleLearningBackendProxyRequest({
      env,
      params: { path: ["auth", "username", "sign-in"] },
      request: createRequest(),
    });

    expect(firstResponse.status).toBe(400);
    expect(secondResponse.status).toBe(429);
    expect(backendRequests).toHaveLength(1);
    expect(redisRequests.every((request) => request.authorization === "Bearer redis-token")).toBe(
      true,
    );
    expect(
      redisRequests.some(
        ({ command }) =>
          command[0] === "SET" &&
          String(command[1]).includes("source:/auth/username/sign-in:203.0.113.20"),
      ),
    ).toBe(true);
  });

  it("falls back to the local proxy limiter when Upstash Redis is unavailable", async () => {
    const backendRequests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === upstashRedisUrl) {
        throw new Error("Redis unavailable.");
      }

      backendRequests.push({ input, init });
      return new Response(JSON.stringify({ message: "backend" }), { status: 400 });
    });
    vi.stubGlobal("fetch", fetch);

    const env = {
      LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
      LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      UPSTASH_REDIS_REST_TOKEN: "redis-token",
      UPSTASH_REDIS_REST_URL: upstashRedisUrl,
    };
    const createRequest = () =>
      new Request("https://smile.test/api/learning-backend/auth/username/sign-in", {
        body: JSON.stringify({ password: "StrongPass1!", username: "student_one" }),
        headers: {
          "cf-connecting-ip": "203.0.113.20",
          "content-type": "application/json",
        },
        method: "POST",
      });

    const firstResponse = await handleLearningBackendProxyRequest({
      env,
      params: { path: ["auth", "username", "sign-in"] },
      request: createRequest(),
    });
    const secondResponse = await handleLearningBackendProxyRequest({
      env,
      params: { path: ["auth", "username", "sign-in"] },
      request: createRequest(),
    });

    expect(firstResponse.status).toBe(400);
    expect(secondResponse.status).toBe(429);
    expect(backendRequests).toHaveLength(1);
  });

  it("can defer public auth request rate limiting to Cloudflare", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ message: "backend" }), { status: 400 }));
    vi.stubGlobal("fetch", fetch);

    const createRequest = () =>
      new Request("https://smile.test/api/learning-backend/auth/username/sign-in", {
        body: JSON.stringify({ password: "StrongPass1!", username: "student_one" }),
        headers: {
          "cf-connecting-ip": "203.0.113.20",
          "content-type": "application/json",
        },
        method: "POST",
      });

    const firstResponse = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS: "false",
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "username", "sign-in"] },
      request: createRequest(),
    });
    const secondResponse = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS: "false",
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "username", "sign-in"] },
      request: createRequest(),
    });

    expect(firstResponse.status).toBe(400);
    expect(secondResponse.status).toBe(400);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("caps slower sign-in bursts at the edge", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T00:00:00.000Z"));
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ message: "backend" }), { status: 400 }));
    vi.stubGlobal("fetch", fetch);

    const createRequest = () =>
      new Request("https://smile.test/api/learning-backend/auth/email/sign-in", {
        body: JSON.stringify({ email: "student@example.com", password: "StrongPass1!" }),
        headers: {
          "cf-connecting-ip": "203.0.113.20",
          "content-type": "application/json",
        },
        method: "POST",
      });

    const responses: Response[] = [];
    for (let attempt = 0; attempt < 9; attempt += 1) {
      responses.push(
        await handleLearningBackendProxyRequest({
          env: {
            LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
            LEARNING_BACKEND_URL: trustedLearningBackendUrl,
          },
          params: { path: ["auth", "email", "sign-in"] },
          request: createRequest(),
        }),
      );

      await vi.advanceTimersByTimeAsync(2_500);
    }

    expect(responses.slice(0, 8).map((response) => response.status)).toEqual(
      Array.from({ length: 8 }, () => 400),
    );
    expect(responses[8]?.status).toBe(429);
    expect(fetch).toHaveBeenCalledTimes(8);
  });

  it("forwards only the refresh session cookie for cookie-backed session routes", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "set-cookie": "__Host-smile-refresh-session=next; HttpOnly; Secure; SameSite=Lax",
        },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "session", "bootstrap"] },
      request: new Request("https://smile.test/api/learning-backend/auth/session/bootstrap", {
        body: JSON.stringify({}),
        headers: {
          cookie: "analytics=local; __Host-smile-refresh-session=session-cookie; theme=light",
          "content-type": "application/json",
        },
        method: "POST",
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBe(
      "__Host-smile-refresh-session=next; HttpOnly; Secure; SameSite=Lax",
    );

    const init = fetch.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;

    expect(headers.get("cookie")).toBe("__Host-smile-refresh-session=session-cookie");
  });

  it("forwards only the Google OAuth state cookie for Google OAuth callbacks", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "set-cookie": "__Host-smile-refresh-session=next; HttpOnly; Secure; SameSite=Lax",
        },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "oauth", "google", "callback"] },
      request: new Request("https://smile.test/api/learning-backend/auth/oauth/google/callback", {
        body: JSON.stringify({
          code: "code",
          redirectUri: "https://smile.test/auth/callback/google",
          state: "state",
        }),
        headers: {
          cookie:
            "analytics=local; __Host-smile-refresh-session=session-cookie; __Host-smile-oauth-google=oauth-state",
          "content-type": "application/json",
          origin: "https://smile.test",
        },
        method: "POST",
      }),
    });

    expect(response.status).toBe(200);

    const init = fetch.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;

    expect(headers.get("cookie")).toBe("__Host-smile-oauth-google=oauth-state");
  });

  it("forwards only the Microsoft OAuth state cookie for Microsoft OAuth callbacks", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "set-cookie": "__Host-smile-refresh-session=next; HttpOnly; Secure; SameSite=Lax",
        },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "oauth", "microsoft", "callback"] },
      request: new Request(
        "https://smile.test/api/learning-backend/auth/oauth/microsoft/callback",
        {
          body: JSON.stringify({
            code: "code",
            redirectUri: "https://smile.test/auth/callback/microsoft",
            state: "state",
          }),
          headers: {
            cookie:
              "analytics=local; __Host-smile-refresh-session=session-cookie; __Host-smile-oauth-microsoft=oauth-state",
            "content-type": "application/json",
            origin: "https://smile.test",
          },
          method: "POST",
        },
      ),
    });

    expect(response.status).toBe(200);

    const init = fetch.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;

    expect(headers.get("cookie")).toBe("__Host-smile-oauth-microsoft=oauth-state");
  });

  it("rejects cross-origin cookie-backed session requests", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "session", "revoke"] },
      request: new Request("https://smile.test/api/learning-backend/auth/session/revoke", {
        body: JSON.stringify({}),
        headers: {
          cookie: "__Host-smile-refresh-session=session-cookie",
          "content-type": "application/json",
          origin: "https://evil.example",
        },
        method: "POST",
      }),
    });

    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects cross-origin Google OAuth start requests", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "oauth", "google", "start"] },
      request: new Request("https://smile.test/api/learning-backend/auth/oauth/google/start", {
        body: JSON.stringify({
          redirectUri: "https://smile.test/auth/callback/google",
        }),
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
        },
        method: "POST",
      }),
    });

    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects cross-origin Microsoft OAuth start requests", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "oauth", "microsoft", "start"] },
      request: new Request("https://smile.test/api/learning-backend/auth/oauth/microsoft/start", {
        body: JSON.stringify({
          redirectUri: "https://smile.test/auth/callback/microsoft",
        }),
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
        },
        method: "POST",
      }),
    });

    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rate limits refresh requests by user sub without requiring email", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ message: "backend" }), { status: 400 }));
    vi.stubGlobal("fetch", fetch);

    const createRequest = (source: string) =>
      new Request("https://smile.test/api/learning-backend/auth/session/refresh", {
        body: JSON.stringify({
          userSub: "student-sub",
        }),
        headers: {
          "cf-connecting-ip": source,
          cookie: "__Host-smile-refresh-session=session-cookie",
          "content-type": "application/json",
        },
        method: "POST",
      });

    const firstResponse = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "session", "refresh"] },
      request: createRequest("203.0.113.20"),
    });
    const secondResponse = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "session", "refresh"] },
      request: createRequest("203.0.113.21"),
    });

    expect(firstResponse.status).toBe(400);
    expect(secondResponse.status).toBe(429);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not rate limit repeated revoke requests because revocation is idempotent", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    const createRequest = () =>
      new Request("https://smile.test/api/learning-backend/auth/session/revoke", {
        body: JSON.stringify({}),
        headers: {
          "cf-connecting-ip": "203.0.113.20",
          cookie: "__Host-smile-refresh-session=session-cookie",
          "content-type": "application/json",
        },
        method: "POST",
      });

    const firstResponse = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "session", "revoke"] },
      request: createRequest(),
    });
    const secondResponse = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "session", "revoke"] },
      request: createRequest(),
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("caps excessive revoke bursts at the edge", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    const createRequest = () =>
      new Request("https://smile.test/api/learning-backend/auth/session/revoke", {
        body: JSON.stringify({}),
        headers: {
          "cf-connecting-ip": "203.0.113.20",
          cookie: "__Host-smile-refresh-session=session-cookie",
          "content-type": "application/json",
        },
        method: "POST",
      });

    const responses: Response[] = [];
    for (let index = 0; index < 21; index += 1) {
      responses.push(
        await handleLearningBackendProxyRequest({
          env: {
            LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
            LEARNING_BACKEND_URL: trustedLearningBackendUrl,
          },
          params: { path: ["auth", "session", "revoke"] },
          request: createRequest(),
        }),
      );
    }

    expect(responses.slice(0, 20).every((response) => response.status === 200)).toBe(true);
    expect(responses[20]?.status).toBe(429);
    expect(fetch).toHaveBeenCalledTimes(20);
    await expect(responses[20]?.json()).resolves.toMatchObject({
      code: "AuthRateLimitExceededException",
    });
  });

  it("fails closed for non-health routes when the proxy secret env is missing", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: { LEARNING_BACKEND_URL: trustedLearningBackendUrl },
      params: { path: ["progress"] },
      request: new Request("https://smile.test/api/learning-backend/progress", {
        headers: {
          authorization: "Bearer token",
        },
        method: "GET",
      }),
    });

    expect(response.status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      message: "Learning backend proxy secret is not configured.",
    });
  });

  it("rejects backend methods outside the proxy allowlist", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["progress"] },
      request: new Request("https://smile.test/api/learning-backend/progress", {
        method: "POST",
      }),
    });

    expect(response.status).toBe(405);
    expect(fetch).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      message: "Learning backend method is not allowed.",
    });
  });

  it("rejects unknown auth routes at the edge", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "session", "destroy"] },
      request: new Request("https://smile.test/api/learning-backend/auth/session/destroy", {
        body: JSON.stringify({}),
        method: "POST",
      }),
    });

    expect(response.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      message: "Learning backend route not found.",
    });
  });

  it("does not proxy the deprecated username resolution compatibility route", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "username", "resolve"] },
      request: new Request("https://smile.test/api/learning-backend/auth/username/resolve", {
        body: JSON.stringify({ username: "student_one" }),
        method: "POST",
      }),
    });

    expect(response.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      message: "Learning backend route not found.",
    });
  });

  it("rejects oversized backend request bodies at the edge", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: trustedLearningBackendUrl,
      },
      params: { path: ["auth", "email", "sign-in"] },
      request: new Request("https://smile.test/api/learning-backend/auth/email/sign-in", {
        body: "x".repeat(300_001),
        method: "POST",
      }),
    });

    expect(response.status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      message: "Learning backend request body is too large.",
    });
  });

  it("fails closed when the backend URL env is missing", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      params: { path: ["health"] },
      request: new Request("https://smile.test/api/learning-backend/health"),
    });

    expect(response.status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      message: "Learning backend URL is not configured.",
    });
  });

  it.each([
    ["plain HTTP", "http://backend.lambda-url.ap-southeast-1.on.aws"],
    ["non-Lambda host", "https://backend.example.test"],
    ["URL with credentials", "https://user:pass@backend.lambda-url.ap-southeast-1.on.aws"],
  ])("fails closed when the backend URL env is %s", async (_label, backendUrl) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await handleLearningBackendProxyRequest({
      env: {
        LEARNING_BACKEND_PROXY_SECRET: "proxy-secret",
        LEARNING_BACKEND_URL: backendUrl,
      },
      params: { path: ["progress"] },
      request: new Request("https://smile.test/api/learning-backend/progress", {
        headers: {
          authorization: "Bearer token",
        },
        method: "GET",
      }),
    });

    expect(response.status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      message: "Learning backend URL is not a trusted Lambda Function URL.",
    });
  });
});
