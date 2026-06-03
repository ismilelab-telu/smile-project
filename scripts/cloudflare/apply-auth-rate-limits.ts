import {
  cloudflareAuthRateLimitPhase,
  createCloudflareAuthRateLimitRulesetPayload,
  type CloudflareRulesetPayload,
  type CloudflareRulesetRulePayload,
} from "../../src/features/learning/server/cloudflare-auth-rate-limits.ts";

type CloudflareApiResponse<T> = {
  errors?: Array<{ code?: number; message?: string }>;
  messages?: Array<{ code?: number; message?: string }>;
  result?: T;
  success?: boolean;
};

type CloudflareRulesetResponse = {
  rules?: CloudflareRulesetRulePayload[];
};

type CloudflareHttpMethod = "GET" | "POST" | "PUT";
type FetchLike = typeof fetch;

export type CloudflareAuthRateLimitDeployOptions = {
  apiBaseUrl?: string;
  apiToken: string;
  dryRun?: boolean;
  fetchImpl?: FetchLike;
  hosts?: string[];
  zoneId: string;
};

export type CloudflareAuthRateLimitDeployResult = {
  method: "POST or PUT" | "POST" | "PUT";
  ok?: true;
  path: string;
  payload?: CloudflareRulesetPayload;
  rules?: Array<{
    description?: string;
    ref?: string;
  }>;
};

const defaultCloudflareApiBaseUrl = "https://api.cloudflare.com/client/v4";

export async function applyCloudflareAuthRateLimits({
  apiBaseUrl = defaultCloudflareApiBaseUrl,
  apiToken,
  dryRun = false,
  fetchImpl = fetch,
  hosts = [],
  zoneId,
}: CloudflareAuthRateLimitDeployOptions): Promise<CloudflareAuthRateLimitDeployResult> {
  const normalizedApiBaseUrl = apiBaseUrl.replace(/\/$/, "");
  const entrypointPath = createZoneEntrypointPath(zoneId);

  if (dryRun) {
    return {
      method: "POST or PUT",
      path: entrypointPath,
      payload: createCloudflareAuthRateLimitRulesetPayload({ hosts }),
    };
  }

  const existingRuleset = await getExistingHttpRateLimitRuleset({
    apiBaseUrl: normalizedApiBaseUrl,
    apiToken,
    fetchImpl,
    zoneId,
  });
  const payload = createCloudflareAuthRateLimitRulesetPayload({
    existingRules: existingRuleset?.rules ?? [],
    hosts,
  });
  const path = existingRuleset ? entrypointPath : `/zones/${zoneId}/rulesets`;
  const method = existingRuleset ? "PUT" : "POST";

  const response = await cloudflareRequest<CloudflareRulesetResponse>({
    apiBaseUrl: normalizedApiBaseUrl,
    apiToken,
    body: payload,
    fetchImpl,
    method,
    path,
  });

  return {
    method,
    ok: true,
    path,
    rules: response.result?.rules?.map((rule) => ({
      description: rule.description,
      ref: rule.ref,
    })),
  };
}

function readCloudflareAuthRateLimitDeployOptionsFromEnv(): CloudflareAuthRateLimitDeployOptions {
  const dryRun = process.env.CLOUDFLARE_AUTH_RATELIMIT_DRY_RUN === "true";

  return {
    apiBaseUrl: process.env.CLOUDFLARE_API_BASE_URL,
    apiToken: dryRun
      ? (process.env.CLOUDFLARE_API_TOKEN?.trim() ?? "")
      : requireEnv("CLOUDFLARE_API_TOKEN"),
    dryRun,
    hosts: readCsvEnv("CLOUDFLARE_AUTH_RATELIMIT_HOSTS"),
    zoneId: requireEnv("CLOUDFLARE_ZONE_ID"),
  };
}

async function getExistingHttpRateLimitRuleset({
  apiBaseUrl,
  apiToken,
  fetchImpl,
  zoneId,
}: {
  apiBaseUrl: string;
  apiToken: string;
  fetchImpl: FetchLike;
  zoneId: string;
}) {
  const response = await cloudflareRequest<CloudflareRulesetResponse>({
    allowNotFound: true,
    apiBaseUrl,
    apiToken,
    fetchImpl,
    method: "GET",
    path: createZoneEntrypointPath(zoneId),
  });

  return response?.result ?? null;
}

async function cloudflareRequest<T>({
  allowNotFound = false,
  apiBaseUrl,
  apiToken,
  body,
  fetchImpl,
  method,
  path,
}: {
  allowNotFound?: boolean;
  apiBaseUrl: string;
  apiToken: string;
  body?: unknown;
  fetchImpl: FetchLike;
  method: CloudflareHttpMethod;
  path: string;
}) {
  const response = await fetchImpl(`${apiBaseUrl}${path}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    method,
  });
  const payload = (await response.json().catch(() => ({}))) as CloudflareApiResponse<T>;

  if (allowNotFound && response.status === 404) {
    return null;
  }

  if (!response.ok || !payload.success) {
    const details = payload.errors?.map((error) => error.message ?? error.code).join("; ");
    throw new Error(
      `Cloudflare ${method} ${path} failed with ${response.status}${details ? `: ${details}` : ""}`,
    );
  }

  return payload;
}

function createZoneEntrypointPath(zoneId: string) {
  return `/zones/${zoneId}/rulesets/phases/${cloudflareAuthRateLimitPhase}/entrypoint`;
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function readCsvEnv(name: string) {
  return (
    process.env[name]
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  );
}

if (import.meta.main) {
  const result = await applyCloudflareAuthRateLimits(
    readCloudflareAuthRateLimitDeployOptionsFromEnv(),
  );

  console.log(JSON.stringify(result, null, 2));
}
