export const authStorageKey = "smile-auth-session";

export type AuthUser = {
  email: string;
  initials: string;
  name: string;
  sub: string;
};

export type AuthSession = {
  accessToken: string;
  expiresAt: number;
  idToken: string;
  refreshToken: string;
  user: AuthUser;
};

type CognitoAuthResult = {
  AccessToken?: string;
  ExpiresIn?: number;
  IdToken?: string;
  RefreshToken?: string;
};

type JwtPayload = {
  aud?: string;
  client_id?: string;
  email?: string;
  exp?: number;
  name?: string;
  sub?: string;
  username?: string;
};

export function createAuthSession({
  authResult,
  fallbackEmail,
  fallbackName,
  previousRefreshToken = "",
}: {
  authResult: CognitoAuthResult;
  fallbackEmail?: string;
  fallbackName?: string;
  previousRefreshToken?: string;
}): AuthSession {
  const idToken = authResult.IdToken ?? "";
  const accessToken = authResult.AccessToken ?? "";
  const refreshToken = authResult.RefreshToken ?? previousRefreshToken;

  if (!idToken || !accessToken) {
    throw new Error("Cognito did not return a complete auth session.");
  }

  const payload = decodeJwtPayload(idToken);
  const email = payload.email ?? fallbackEmail ?? "";
  const name = payload.name ?? fallbackName ?? email.split("@")[0] ?? "Smile User";
  const expiresAt = payload.exp
    ? payload.exp * 1000
    : Date.now() + Math.max(1, authResult.ExpiresIn ?? 3600) * 1000;

  return {
    accessToken,
    expiresAt,
    idToken,
    refreshToken,
    user: {
      email,
      initials: createInitials(name || email),
      name: name || email,
      sub: payload.sub ?? payload.username ?? "",
    },
  };
}

export function getStoredAuthSession({ includeExpired = false } = {}) {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(authStorageKey);

  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession) as AuthSession;

    if (!isAuthSessionShape(session)) {
      return null;
    }

    if (!includeExpired && isAuthSessionExpired(session)) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function storeAuthSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(authStorageKey, JSON.stringify(session));
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(authStorageKey);
}

export function isAuthSessionExpired(session: AuthSession, skewMs = 30_000) {
  return Date.now() + skewMs >= session.expiresAt;
}

export function getAuthAuthorizationHeader() {
  const session = getStoredAuthSession();

  return session ? `Bearer ${session.idToken}` : "";
}

function isAuthSessionShape(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<AuthSession>;

  return (
    typeof session.accessToken === "string" &&
    typeof session.expiresAt === "number" &&
    typeof session.idToken === "string" &&
    typeof session.refreshToken === "string" &&
    Boolean(session.user) &&
    typeof session.user?.email === "string" &&
    typeof session.user?.name === "string"
  );
}

function decodeJwtPayload(token: string): JwtPayload {
  const payload = token.split(".")[1];

  if (!payload) {
    return {};
  }

  try {
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

    return JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload;
  } catch {
    return {};
  }
}

function createInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "SM";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
