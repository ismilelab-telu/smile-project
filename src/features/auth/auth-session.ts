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

type StoredAuthSession = Omit<AuthSession, "refreshToken"> & {
  refreshToken?: string;
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

let inMemoryRefreshToken = "";

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

  const storedRawSession = window.sessionStorage.getItem(authStorageKey);
  const rawSession = storedRawSession ?? migrateLegacyLocalAuthSession();

  if (!rawSession) {
    return null;
  }

  try {
    const storedSession = JSON.parse(rawSession) as StoredAuthSession;

    if (!isStoredAuthSessionShape(storedSession)) {
      window.localStorage.removeItem(authStorageKey);
      window.sessionStorage.removeItem(authStorageKey);
      return null;
    }

    const session = hydrateStoredAuthSession(storedSession);

    if (!storedRawSession || storedSession.refreshToken) {
      writeStoredAuthSession(session);
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

  if (session.refreshToken) {
    inMemoryRefreshToken = session.refreshToken;
  }

  writeStoredAuthSession(session);
  window.localStorage.removeItem(authStorageKey);
  dispatchAuthSessionChanged();
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(authStorageKey);
  window.localStorage.removeItem(authStorageKey);
  inMemoryRefreshToken = "";
  dispatchAuthSessionChanged();
}

export function isAuthSessionExpired(session: AuthSession, skewMs = 30_000) {
  return Date.now() + skewMs >= session.expiresAt;
}

export function getAuthAuthorizationHeader() {
  const session = getStoredAuthSession();

  return session ? `Bearer ${session.idToken}` : "";
}

function isStoredAuthSessionShape(value: unknown): value is StoredAuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<StoredAuthSession>;

  return (
    typeof session.accessToken === "string" &&
    typeof session.expiresAt === "number" &&
    typeof session.idToken === "string" &&
    (session.refreshToken === undefined || typeof session.refreshToken === "string") &&
    Boolean(session.user) &&
    typeof session.user?.email === "string" &&
    typeof session.user?.name === "string"
  );
}

function hydrateStoredAuthSession(storedSession: StoredAuthSession): AuthSession {
  if (storedSession.refreshToken) {
    inMemoryRefreshToken = storedSession.refreshToken;
  }

  return {
    ...storedSession,
    refreshToken: inMemoryRefreshToken,
  };
}

function writeStoredAuthSession(session: AuthSession) {
  const storedSession: StoredAuthSession = {
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
    idToken: session.idToken,
    user: session.user,
  };

  window.sessionStorage.setItem(authStorageKey, JSON.stringify(storedSession));
}

function migrateLegacyLocalAuthSession() {
  const rawSession = window.localStorage.getItem(authStorageKey);

  if (!rawSession) {
    return null;
  }

  window.localStorage.removeItem(authStorageKey);

  return rawSession;
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
