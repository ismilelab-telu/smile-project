import { bootstrapCognitoSession, refreshCognitoSession } from "./cognito-auth";
import {
  clearAuthSession,
  getStoredAuthSession,
  isAuthSessionExpired,
  storeAuthSession,
  type AuthSession,
} from "./auth-session";

export const authRefreshSkewMs = 5 * 60 * 1000;

let pendingAuthSessionRefresh: Promise<AuthSession | null> | null = null;
let pendingAuthSessionBootstrap: Promise<AuthSession | null> | null = null;
let authSessionRefreshGeneration = 0;

export function invalidateStoredAuthSessionRefresh() {
  authSessionRefreshGeneration += 1;
  pendingAuthSessionRefresh = null;
  pendingAuthSessionBootstrap = null;
}

export async function getFreshStoredAuthSession({ force = false } = {}) {
  const session = getStoredAuthSession({ includeExpired: true });

  if (!session) {
    return getBootstrappedAuthSession();
  }

  if (!force && !isAuthSessionExpired(session, authRefreshSkewMs)) {
    return session;
  }

  if (!pendingAuthSessionRefresh) {
    const refreshGeneration = authSessionRefreshGeneration;
    const refreshTarget = session;
    let refreshPromise: Promise<AuthSession | null>;

    refreshPromise = refreshCognitoSession(session)
      .then((nextSession) => {
        if (!isAuthSessionRefreshCurrent(refreshTarget, refreshGeneration)) {
          return null;
        }

        storeAuthSession(nextSession);
        return nextSession;
      })
      .catch(() => {
        if (isAuthSessionRefreshCurrent(refreshTarget, refreshGeneration)) {
          clearAuthSession();
        }

        return null;
      })
      .finally(() => {
        if (pendingAuthSessionRefresh === refreshPromise) {
          pendingAuthSessionRefresh = null;
        }
      });

    pendingAuthSessionRefresh = refreshPromise;
  }

  return pendingAuthSessionRefresh;
}

function getBootstrappedAuthSession() {
  if (!pendingAuthSessionBootstrap) {
    const bootstrapGeneration = authSessionRefreshGeneration;
    let bootstrapPromise: Promise<AuthSession | null>;

    bootstrapPromise = bootstrapCognitoSession()
      .then((nextSession) => {
        if (authSessionRefreshGeneration !== bootstrapGeneration) {
          return null;
        }

        storeAuthSession(nextSession);
        return nextSession;
      })
      .catch(() => null)
      .finally(() => {
        if (pendingAuthSessionBootstrap === bootstrapPromise) {
          pendingAuthSessionBootstrap = null;
        }
      });

    pendingAuthSessionBootstrap = bootstrapPromise;
  }

  return pendingAuthSessionBootstrap;
}

function isAuthSessionRefreshCurrent(session: AuthSession, generation: number) {
  if (authSessionRefreshGeneration !== generation) {
    return false;
  }

  const currentSession = getStoredAuthSession({ includeExpired: true });

  return (
    currentSession?.refreshToken === session.refreshToken &&
    currentSession.user.sub === session.user.sub
  );
}
