export const cloudflareAuthRateLimitPhase = "http_ratelimit";
export const cloudflareAuthRateLimitRulesetName = "Smile auth rate limits";

export type CloudflareAuthRateLimitRule = {
  description: string;
  mitigationTimeoutSeconds: number;
  paths: string[];
  periodSeconds: number;
  ref: string;
  requestsPerPeriod: number;
};

export type CloudflareRateLimitRulePayload = {
  action: "block";
  action_parameters: {
    response: {
      content: string;
      content_type: "application/json";
      status_code: 429;
    };
  };
  description: string;
  enabled: true;
  expression: string;
  ratelimit: {
    characteristics: string[];
    mitigation_timeout: number;
    period: number;
    requests_per_period: number;
    requests_to_origin: false;
  };
  ref: string;
};

export type CloudflareRulesetRulePayload = {
  action?: string;
  action_parameters?: unknown;
  description?: string;
  enabled?: boolean;
  expression?: string;
  logging?: unknown;
  ratelimit?: unknown;
  ref?: string;
};

export type CloudflareRulesetPayload = {
  description: string;
  kind: "zone";
  name: string;
  phase: typeof cloudflareAuthRateLimitPhase;
  rules: CloudflareRulesetRulePayload[];
};

const learningBackendAuthPrefix = "/api/learning-backend/auth";
const rateLimitResponseCode = "AuthRateLimitExceededException";
const rateLimitResponseMessage = "Too many auth requests. Please wait before trying again.";

export const cloudflareAuthRateLimitRules = [
  {
    description: "Smile auth public routes burst by IP",
    mitigationTimeoutSeconds: 10,
    paths: [
      `${learningBackendAuthPrefix}/email/sign-in`,
      `${learningBackendAuthPrefix}/username/sign-in`,
      `${learningBackendAuthPrefix}/oauth/google/start`,
      `${learningBackendAuthPrefix}/oauth/google/callback`,
      `${learningBackendAuthPrefix}/sign-up/start`,
      `${learningBackendAuthPrefix}/confirmation/resend`,
      `${learningBackendAuthPrefix}/confirmation/confirm`,
      `${learningBackendAuthPrefix}/password-reset/request`,
      `${learningBackendAuthPrefix}/password-reset/confirm`,
      `${learningBackendAuthPrefix}/session/bootstrap`,
      `${learningBackendAuthPrefix}/session/refresh`,
      `${learningBackendAuthPrefix}/session/revoke`,
    ],
    periodSeconds: 10,
    ref: "smile-auth-public-routes-burst-ip",
    requestsPerPeriod: 10,
  },
] satisfies CloudflareAuthRateLimitRule[];

export function createCloudflareAuthRateLimitRules(
  _options: {
    hosts?: string[];
  } = {},
): CloudflareRateLimitRulePayload[] {
  return cloudflareAuthRateLimitRules.map((rule) => ({
    action: "block",
    action_parameters: {
      response: {
        content: JSON.stringify({
          code: rateLimitResponseCode,
          message: rateLimitResponseMessage,
          retryAfterSeconds: rule.mitigationTimeoutSeconds,
        }),
        content_type: "application/json",
        status_code: 429,
      },
    },
    description: rule.description,
    enabled: true,
    expression: createRateLimitExpression(rule.paths),
    ratelimit: {
      characteristics: ["cf.colo.id", "ip.src"],
      mitigation_timeout: rule.mitigationTimeoutSeconds,
      period: rule.periodSeconds,
      requests_per_period: rule.requestsPerPeriod,
      requests_to_origin: false,
    },
    ref: rule.ref,
  }));
}

export function createCloudflareAuthRateLimitRulesetPayload({
  existingRules = [],
  hosts = [],
}: {
  existingRules?: CloudflareRulesetRulePayload[];
  hosts?: string[];
} = {}): CloudflareRulesetPayload {
  const managedRefs = new Set(cloudflareAuthRateLimitRules.map((rule) => rule.ref));
  const preservedRules = existingRules
    .map(sanitizeCloudflareRulesetRule)
    .filter((rule) => !rule.ref || !managedRefs.has(rule.ref));

  return {
    description:
      "Blocks abusive Smile authentication traffic at Cloudflare before it reaches Pages or AWS.",
    kind: "zone",
    name: cloudflareAuthRateLimitRulesetName,
    phase: cloudflareAuthRateLimitPhase,
    rules: [...preservedRules, ...createCloudflareAuthRateLimitRules({ hosts })],
  };
}

function createRateLimitExpression(paths: string[]) {
  const pathExpression =
    paths.length === 1
      ? `http.request.uri.path eq ${quoteCloudflareExpressionString(paths[0] ?? "")}`
      : `http.request.uri.path in { ${paths.map(quoteCloudflareExpressionString).join(" ")} }`;
  return `(${pathExpression})`;
}

function quoteCloudflareExpressionString(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function sanitizeCloudflareRulesetRule(rule: CloudflareRulesetRulePayload) {
  const sanitizedRule: CloudflareRulesetRulePayload = {};

  if (rule.action) {
    sanitizedRule.action = rule.action;
  }
  if (rule.action_parameters) {
    sanitizedRule.action_parameters = rule.action_parameters;
  }
  if (rule.description) {
    sanitizedRule.description = rule.description;
  }
  if (typeof rule.enabled === "boolean") {
    sanitizedRule.enabled = rule.enabled;
  }
  if (rule.expression) {
    sanitizedRule.expression = rule.expression;
  }
  if (rule.logging) {
    sanitizedRule.logging = rule.logging;
  }
  if (rule.ratelimit) {
    sanitizedRule.ratelimit = rule.ratelimit;
  }
  if (rule.ref) {
    sanitizedRule.ref = rule.ref;
  }

  return sanitizedRule;
}
