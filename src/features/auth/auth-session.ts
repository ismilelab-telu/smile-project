export const authStorageKey = "smile-auth-session";
export const authSessionChangedEvent = "smile-auth-session-changed";

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

let inMemoryAuthSession: AuthSession | null = null;

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

  if (!inMemoryAuthSession) {
    clearStoredAuthSessionData();
    return null;
  }

  if (!includeExpired && isAuthSessionExpired(inMemoryAuthSession)) {
    return null;
  }

  return inMemoryAuthSession;
}

export function storeAuthSession(session: AuthSession) {
  inMemoryAuthSession = session;

  if (typeof window === "undefined") {
    return;
  }

  clearStoredAuthSessionData();
  dispatchAuthSessionChanged();
}

export function clearAuthSession() {
  inMemoryAuthSession = null;

  if (typeof window === "undefined") {
    return;
  }

  clearStoredAuthSessionData();
  dispatchAuthSessionChanged();
}

export function isAuthSessionExpired(session: AuthSession, skewMs = 30_000) {
  return Date.now() + skewMs >= session.expiresAt;
}

export function getAuthAuthorizationHeader() {
  const session = getStoredAuthSession();

  return session ? `Bearer ${session.accessToken}` : "";
}

function clearStoredAuthSessionData() {
  window.localStorage.removeItem(authStorageKey);
  window.sessionStorage.removeItem(authStorageKey);
}

function dispatchAuthSessionChanged() {
  window.dispatchEvent(new Event(authSessionChangedEvent));
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
