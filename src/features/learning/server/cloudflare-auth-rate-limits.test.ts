import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  cloudflareAuthRateLimitPhase,
  cloudflareAuthRateLimitRules,
  createCloudflareAuthRateLimitRules,
  createCloudflareAuthRateLimitRulesetPayload,
} from "./cloudflare-auth-rate-limits";
import { applyCloudflareAuthRateLimits } from "../../../../scripts/cloudflare/apply-auth-rate-limits.ts";

const expectedAuthPaths = [
  "/api/learning-backend/auth/email/sign-in",
  "/api/learning-backend/auth/username/sign-in",
  "/api/learning-backend/auth/oauth/google/start",
  "/api/learning-backend/auth/oauth/google/callback",
  "/api/learning-backend/auth/sign-up/start",
  "/api/learning-backend/auth/confirmation/resend",
  "/api/learning-backend/auth/confirmation/confirm",
  "/api/learning-backend/auth/password-reset/request",
  "/api/learning-backend/auth/password-reset/confirm",
  "/api/learning-backend/auth/session/bootstrap",
  "/api/learning-backend/auth/session/refresh",
  "/api/learning-backend/auth/session/revoke",
];
const allowedCloudflareRateLimitPeriods = new Set([
  10, 15, 20, 30, 40, 45, 60, 90, 120, 180, 240, 300, 480, 600, 900, 1200, 1800, 2400, 3600, 65535,
]);

describe("Cloudflare auth rate limit rules", () => {
  it("covers public auth routes through the Pages backend proxy", () => {
    const configuredPaths = new Set(cloudflareAuthRateLimitRules.flatMap((rule) => rule.paths));

    expect(cloudflareAuthRateLimitRules).toHaveLength(1);
    expect([...configuredPaths].sort()).toEqual(expectedAuthPaths.sort());
  });

  it("creates JSON 429 block responses that match frontend auth error handling", () => {
    const rules = createCloudflareAuthRateLimitRules({ hosts: ["Smile.Example"] });

    expect(rules).toHaveLength(cloudflareAuthRateLimitRules.length);
    expect(rules[0]?.action).toBe("block");
    expect(rules[0]?.action_parameters.response.status_code).toBe(429);
    expect(rules[0]?.action_parameters.response.content_type).toBe("application/json");
    expect(JSON.parse(rules[0]?.action_parameters.response.content ?? "{}")).toMatchObject({
      code: "AuthRateLimitExceededException",
      message: "Too many auth requests. Please wait before trying again.",
    });
    expect(rules[0]?.expression).toContain("http.request.uri.path in { ");
    expect(rules[0]?.expression).not.toContain("http.host");
    expect(rules[0]?.expression).not.toContain("http.request.method");
    expect(rules[0]?.ratelimit.characteristics).toEqual(["cf.colo.id", "ip.src"]);
    expect(rules[0]?.ratelimit.period).toBe(10);
    expect(rules[0]?.ratelimit.mitigation_timeout).toBe(10);
  });

  it("uses Cloudflare-supported rate limit windows and mitigation timeouts", () => {
    const rules = createCloudflareAuthRateLimitRules();

    for (const rule of rules) {
      expect(allowedCloudflareRateLimitPeriods.has(rule.ratelimit.period)).toBe(true);
      expect(
        rule.ratelimit.mitigation_timeout === 0 || rule.ratelimit.mitigation_timeout >= 10,
      ).toBe(true);
    }
  });

  it("preserves unrelated rules and appends Smile managed rate limit rules at the end", () => {
    const payload = createCloudflareAuthRateLimitRulesetPayload({
      existingRules: [
        {
          action: "block",
          description: "Existing rule",
          expression: 'http.request.uri.path eq "/old"',
          ref: "keep-this-rule",
        },
        {
          action: "block",
          description: "Old Smile rule",
          expression: 'http.request.uri.path eq "/stale"',
          ref: "smile-auth-public-routes-burst-ip",
        },
      ],
    });

    expect(payload.phase).toBe(cloudflareAuthRateLimitPhase);
    expect(payload.rules[0]).toMatchObject({ ref: "keep-this-rule" });
    expect(payload.rules.map((rule) => rule.ref)).toEqual([
      "keep-this-rule",
      ...cloudflareAuthRateLimitRules.map((rule) => rule.ref),
    ]);
  });

  it("dry-runs the deploy payload without calling Cloudflare", async () => {
    const fetchMock = vi.fn();
    const result = await applyCloudflareAuthRateLimits({
      apiToken: "token",
      dryRun: true,
      fetchImpl: fetchMock as unknown as typeof fetch,
      hosts: ["Smile.Example"],
      zoneId: "zone-id",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.method).toBe("POST or PUT");
    expect(result.path).toBe("/zones/zone-id/rulesets/phases/http_ratelimit/entrypoint");
    expect(result.payload?.rules[0]?.expression).toContain("http.request.uri.path in { ");
    expect(result.payload?.rules[0]?.expression).not.toContain("http.host");
  });

  it("creates the http_ratelimit ruleset when Cloudflare has no entry point yet", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false }), { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: {
              rules: [{ description: "Smile auth sign-in burst by IP", ref: "created-rule" }],
            },
            success: true,
          }),
          { status: 200 },
        ),
      );

    const result = await applyCloudflareAuthRateLimits({
      apiBaseUrl: "https://api.example.test",
      apiToken: "token",
      fetchImpl: fetchMock as unknown as typeof fetch,
      zoneId: "zone-id",
    });

    expect(result.method).toBe("POST");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.example.test/zones/zone-id/rulesets/phases/http_ratelimit/entrypoint",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.example.test/zones/zone-id/rulesets");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
      kind: "zone",
      phase: cloudflareAuthRateLimitPhase,
    });
  });

  it("updates an existing ruleset while preserving unrelated rules", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: {
              rules: [
                {
                  action: "block",
                  description: "Existing customer rule",
                  expression: 'http.request.uri.path eq "/legacy"',
                  ref: "keep-this-rule",
                },
                {
                  action: "block",
                  description: "Old Smile rule",
                  expression: 'http.request.uri.path eq "/old-smile"',
                  ref: "smile-auth-public-routes-burst-ip",
                },
              ],
            },
            success: true,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: {
              rules: [{ description: "Existing customer rule", ref: "keep-this-rule" }],
            },
            success: true,
          }),
          { status: 200 },
        ),
      );

    const result = await applyCloudflareAuthRateLimits({
      apiBaseUrl: "https://api.example.test/",
      apiToken: "token",
      fetchImpl: fetchMock as unknown as typeof fetch,
      zoneId: "zone-id",
    });
    const updateBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      rules: Array<{ ref?: string }>;
    };

    expect(result.method).toBe("PUT");
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.example.test/zones/zone-id/rulesets/phases/http_ratelimit/entrypoint",
    );
    expect(updateBody.rules.map((rule) => rule.ref)).toEqual([
      "keep-this-rule",
      ...cloudflareAuthRateLimitRules.map((rule) => rule.ref),
    ]);
  });

  it("keeps the Terraform artifact aligned with the managed auth rules", () => {
    const terraformConfig = readFileSync(
      resolve(process.cwd(), "infra/cloudflare/auth-rate-limits.tf"),
      "utf8",
    );

    for (const rule of cloudflareAuthRateLimitRules) {
      expect(terraformConfig).toContain(rule.ref);
      for (const path of rule.paths) {
        expect(terraformConfig).toContain(path);
      }
    }
  });
});
