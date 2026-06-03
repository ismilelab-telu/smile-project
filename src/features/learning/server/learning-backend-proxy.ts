type LearningBackendProxyEnv = {
  LEARNING_BACKEND_URL?: string;
  LEARNING_BACKEND_PROXY_SECRET?: string;
};

type PagesRouteParams = {
  path?: string | string[];
};

const learningBackendProxySecretHeader = "x-smile-learning-backend-proxy-secret";
const authRateLimitTtlMs = 60 * 60 * 1000;
const authRateLimitState = new Map<string, number>();
const authBurstLimitState = new Map<string, { count: number; resetAt: number }>();
const refreshSessionCookieName = "__Host-smile-refresh-session";
const authProxySignInBurstLimit = 8;
const authProxySignInBurstWindowMs = 5 * 60 * 1000;
const authProxyRevokeBurstLimit = 20;
const authProxyRevokeBurstWindowMs = 60 * 1000;
const maxProxyRequestBodyBytes = 300_000;
const trustedLearningBackendHostPattern = /^[a-z0-9-]+\.lambda-url\.[a-z0-9-]+\.on\.aws$/;

const authProxyCooldowns = [
  {
    identifierKey: "email",
    path: "/auth/sign-up/start",
    seconds: 5,
  },
  {
    identifierKey: "email",
    path: "/auth/confirmation/resend",
    seconds: 30,
  },
  {
    identifierKey: "email",
    path: "/auth/confirmation/confirm",
    seconds: 3,
  },
  {
    identifierKey: "email",
    path: "/auth/email/sign-in",
    seconds: 2,
  },
  {
    identifierKey: "username",
    path: "/auth/username/sign-in",
    seconds: 2,
  },
  {
    identifierKey: "userSub",
    path: "/auth/session/refresh",
    seconds: 2,
  },
  {
    path: "/auth/session/bootstrap",
    seconds: 2,
  },
  {
    identifierKey: "email",
    path: "/auth/password-reset/request",
    seconds: 30,
  },
  {
    identifierKey: "email",
    path: "/auth/password-reset/confirm",
    seconds: 3,
  },
] as const;

const allowedAuthProxyPaths = new Set([
  "/auth/sign-up/start",
  "/auth/confirmation/resend",
  "/auth/confirmation/confirm",
  "/auth/email/sign-in",
  "/auth/username/sign-in",
  "/auth/session/refresh",
  "/auth/session/bootstrap",
  "/auth/session/revoke",
  "/auth/password-reset/request",
  "/auth/password-reset/confirm",
]);

const proxiedResponseHeaders = ["content-type", "etag", "set-cookie"] as const;

export async function handleLearningBackendProxyRequest({
  env,
  params,
  request,
}: {
  env?: LearningBackendProxyEnv;
  params?: PagesRouteParams;
  request: Request;
}) {
  const pathname = getBackendPath(params);

  if (!isAllowedLearningBackendProxyPath(pathname)) {
    return createProxyJsonResponse(404, { message: "Learning backend route not found." });
  }

  if (!isAllowedLearningBackendProxyMethod(pathname, request.method)) {
    return createProxyJsonResponse(405, { message: "Learning backend method is not allowed." });
  }

  const requestBody = await readProxyRequestBody(request);
  if (requestBody instanceof Response) {
    return requestBody;
  }

  const rateLimitResponse = getAuthProxyRateLimitResponse(request, pathname, requestBody);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const cookieBackedAuthResponse = getCookieBackedAuthOriginResponse(request, pathname);
  if (cookieBackedAuthResponse) {
    return cookieBackedAuthResponse;
  }

  const backendUrl = env?.LEARNING_BACKEND_URL?.trim();
  if (!backendUrl) {
    return createProxyJsonResponse(500, { message: "Learning backend URL is not configured." });
  }

  const backendBaseUrl = parseTrustedLearningBackendUrl(backendUrl);
  if (!backendBaseUrl) {
    return createProxyJsonResponse(500, {
      message: "Learning backend URL is not a trusted Lambda Function URL.",
    });
  }

  if (pathname !== "/health" && !env?.LEARNING_BACKEND_PROXY_SECRET?.trim()) {
    return createProxyJsonResponse(500, {
      message: "Learning backend proxy secret is not configured.",
    });
  }

  const targetUrl = createLearningBackendTargetUrl({
    backendBaseUrl,
    pathname,
  });
  const headers = createForwardHeaders(request, env, pathname);
  const init: RequestInit = {
    headers,
    method: request.method,
  };

  if (requestBody) {
    init.body = requestBody;
  }

  const backendResponse = await fetch(targetUrl, init);
  const responseHeaders = new Headers();

  for (const headerName of proxiedResponseHeaders) {
    const value = backendResponse.headers.get(headerName);
    if (value) {
      responseHeaders.set(headerName, value);
    }
  }

  responseHeaders.set("cache-control", "no-store");
  responseHeaders.set("x-content-type-options", "nosniff");

  return new Response(backendResponse.body, {
    headers: responseHeaders,
    status: backendResponse.status,
    statusText: backendResponse.statusText,
  });
}

export function clearLearningBackendProxyRateLimitsForTests() {
  authRateLimitState.clear();
  authBurstLimitState.clear();
}

function getBackendPath(params?: PagesRouteParams) {
  const path = params?.path;
  const segments = Array.isArray(path) ? path : path ? [path] : [];
  const normalizedSegments = segments
    .flatMap((segment) => segment.split("/"))
    .map((segment) => segment.trim())
    .filter(Boolean);

  return `/${normalizedSegments.map(encodeURIComponent).join("/")}`;
}

function isAllowedLearningBackendProxyPath(pathname: string) {
  return (
    pathname === "/health" ||
    pathname === "/progress" ||
    pathname === "/uploads/presign" ||
    pathname === "/datasets/inspect" ||
    pathname === "/pandas/validate" ||
    allowedAuthProxyPaths.has(pathname)
  );
}

function isAllowedLearningBackendProxyMethod(pathname: string, method: string) {
  const normalizedMethod = method.toUpperCase();

  if (normalizedMethod === "OPTIONS") {
    return true;
  }

  if (pathname === "/health") {
    return ["GET", "HEAD"].includes(normalizedMethod);
  }

  if (pathname === "/progress") {
    return ["GET", "PUT"].includes(normalizedMethod);
  }

  return (
    normalizedMethod === "POST" &&
    (pathname === "/uploads/presign" ||
      pathname === "/datasets/inspect" ||
      pathname === "/pandas/validate" ||
      allowedAuthProxyPaths.has(pathname))
  );
}

async function readProxyRequestBody(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
    return null;
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxProxyRequestBodyBytes) {
    return createProxyJsonResponse(413, { message: "Learning backend request body is too large." });
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > maxProxyRequestBodyBytes) {
    return createProxyJsonResponse(413, { message: "Learning backend request body is too large." });
  }

  return body;
}

function getAuthProxyRateLimitResponse(
  request: Request,
  pathname: string,
  requestBody: ArrayBuffer | null,
) {
  if (request.method.toUpperCase() !== "POST") {
    return null;
  }

  if (pathname === "/auth/session/revoke") {
    const limit = reserveProxyBurstLimit(
      `source:${pathname}:${getProxyRequestSource(request)}`,
      authProxyRevokeBurstLimit,
      authProxyRevokeBurstWindowMs,
      Date.now(),
    );

    return limit ? createRateLimitResponse(limit) : null;
  }

  const rule = authProxyCooldowns.find((candidate) => candidate.path === pathname);
  if (!rule) {
    return null;
  }

  const now = Date.now();
  const source = getProxyRequestSource(request);
  const sourceLimit = reserveProxyRateLimit(`source:${pathname}:${source}`, rule.seconds, now);

  if (sourceLimit) {
    return createRateLimitResponse(sourceLimit);
  }

  const body = parseProxyJsonObject(requestBody);
  const identifierKey = "identifierKey" in rule ? rule.identifierKey : undefined;
  const identifier =
    body && typeof body === "object" && identifierKey && identifierKey in body
      ? String((body as Record<string, unknown>)[identifierKey] ?? "")
          .trim()
          .toLowerCase()
      : "";

  const burstLimit = getAuthProxySignInBurstLimit(pathname, source, identifier, now);
  if (burstLimit) {
    return createRateLimitResponse(burstLimit);
  }

  if (!identifier) {
    return null;
  }

  const identifierLimit = reserveProxyRateLimit(
    `identifier:${pathname}:${identifier}`,
    rule.seconds,
    now,
  );

  return identifierLimit ? createRateLimitResponse(identifierLimit) : null;
}

function getAuthProxySignInBurstLimit(
  pathname: string,
  source: string,
  identifier: string,
  now: number,
) {
  if (!["/auth/email/sign-in", "/auth/username/sign-in"].includes(pathname)) {
    return null;
  }

  const sourceLimit = reserveProxyBurstLimit(
    `burst:source:${pathname}:${source}`,
    authProxySignInBurstLimit,
    authProxySignInBurstWindowMs,
    now,
  );
  if (sourceLimit) {
    return sourceLimit;
  }

  if (!identifier) {
    return null;
  }

  return reserveProxyBurstLimit(
    `burst:identifier:${pathname}:${identifier}`,
    authProxySignInBurstLimit,
    authProxySignInBurstWindowMs,
    now,
  );
}

function parseProxyJsonObject(requestBody: ArrayBuffer | null) {
  if (!requestBody) {
    return null;
  }

  try {
    const body = JSON.parse(new TextDecoder().decode(requestBody)) as unknown;

    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

function reserveProxyRateLimit(key: string, cooldownSeconds: number, now: number) {
  cleanupProxyRateLimits(now);

  const nextAllowedAt = authRateLimitState.get(key) ?? 0;
  if (nextAllowedAt > now) {
    return {
      nextAllowedAt,
      retryAfterSeconds: Math.max(1, Math.ceil((nextAllowedAt - now) / 1000)),
    };
  }

  authRateLimitState.set(key, now + Math.max(1, cooldownSeconds) * 1000);
  return null;
}

function cleanupProxyRateLimits(now: number) {
  for (const [key, nextAllowedAt] of authRateLimitState.entries()) {
    if (nextAllowedAt + authRateLimitTtlMs <= now) {
      authRateLimitState.delete(key);
    }
  }

  for (const [key, state] of authBurstLimitState.entries()) {
    if (state.resetAt + authRateLimitTtlMs <= now) {
      authBurstLimitState.delete(key);
    }
  }
}

function reserveProxyBurstLimit(key: string, maxRequests: number, windowMs: number, now: number) {
  cleanupProxyRateLimits(now);

  const normalizedWindowMs = Math.max(1, windowMs);
  const currentState = authBurstLimitState.get(key);
  if (!currentState || currentState.resetAt <= now) {
    authBurstLimitState.set(key, {
      count: 1,
      resetAt: now + normalizedWindowMs,
    });
    return null;
  }

  if (currentState.count >= Math.max(1, maxRequests)) {
    return {
      nextAllowedAt: currentState.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((currentState.resetAt - now) / 1000)),
    };
  }

  currentState.count += 1;
  return null;
}

function createRateLimitResponse(limit: { nextAllowedAt: number; retryAfterSeconds: number }) {
  return createProxyJsonResponse(429, {
    code: "AuthRateLimitExceededException",
    message: "Too many auth requests. Please wait before trying again.",
    nextAllowedAt: Math.ceil(limit.nextAllowedAt / 1000),
    retryAfterSeconds: limit.retryAfterSeconds,
  });
}

function createLearningBackendTargetUrl({
  backendBaseUrl,
  pathname,
}: {
  backendBaseUrl: URL;
  pathname: string;
}) {
  return new URL(pathname, backendBaseUrl);
}

function parseTrustedLearningBackendUrl(backendUrl: string) {
  try {
    const url = new URL(backendUrl);
    const hasOnlyRootPath = url.pathname === "" || url.pathname === "/";

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !hasOnlyRootPath ||
      !trustedLearningBackendHostPattern.test(url.hostname)
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function createForwardHeaders(
  request: Request,
  env: LearningBackendProxyEnv | undefined,
  pathname: string,
) {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");
  const source = getProxyRequestSource(request);
  const proxySecret = env?.LEARNING_BACKEND_PROXY_SECRET?.trim();

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (authorization && isProtectedLearningBackendProxyPath(pathname)) {
    headers.set("authorization", authorization);
  }

  const cookieHeader = createForwardCookieHeader(request, pathname);
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  headers.set("cf-connecting-ip", source);
  headers.set("x-forwarded-for", source);

  if (proxySecret) {
    headers.set(learningBackendProxySecretHeader, proxySecret);
  }

  return headers;
}

function createForwardCookieHeader(request: Request, pathname: string) {
  if (!shouldForwardRefreshSessionCookie(pathname)) {
    return "";
  }

  const cookie = request.headers.get("cookie");
  if (!cookie) {
    return "";
  }

  const refreshSessionCookie = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${refreshSessionCookieName}=`));

  return refreshSessionCookie ?? "";
}

function shouldForwardRefreshSessionCookie(pathname: string) {
  return ["/auth/session/bootstrap", "/auth/session/refresh", "/auth/session/revoke"].includes(
    pathname,
  );
}

function getCookieBackedAuthOriginResponse(request: Request, pathname: string) {
  if (!shouldForwardRefreshSessionCookie(pathname)) {
    return null;
  }

  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin")?.trim();
  if (origin && origin !== requestOrigin) {
    return createProxyJsonResponse(403, { message: "Auth session request origin is not allowed." });
  }

  const referer = request.headers.get("referer")?.trim();
  if (referer) {
    try {
      if (new URL(referer).origin !== requestOrigin) {
        return createProxyJsonResponse(403, {
          message: "Auth session request origin is not allowed.",
        });
      }
    } catch {
      return createProxyJsonResponse(403, {
        message: "Auth session request origin is not allowed.",
      });
    }
  }

  return null;
}

function isProtectedLearningBackendProxyPath(pathname: string) {
  return (
    pathname === "/progress" ||
    pathname === "/uploads/presign" ||
    pathname === "/datasets/inspect" ||
    pathname === "/pandas/validate"
  );
}

function getProxyRequestSource(request: Request) {
  return request.headers.get("cf-connecting-ip")?.trim() || "unknown";
}

function createProxyJsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
    status,
  });
}
