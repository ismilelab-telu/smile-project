import { refreshCognitoSession } from "./cognito-auth";
import {
  clearAuthSession,
  getStoredAuthSession,
  isAuthSessionExpired,
  storeAuthSession,
  type AuthSession,
} from "./auth-session";

export const authRefreshSkewMs = 5 * 60 * 1000;

let pendingAuthSessionRefresh: Promise<AuthSession | null> | null = null;

export async function getFreshStoredAuthSession({ force = false } = {}) {
  const session = getStoredAuthSession({ includeExpired: true });

  if (!session) {
    return null;
  }

  if (!force && !isAuthSessionExpired(session, authRefreshSkewMs)) {
    return session;
  }

  if (!session.refreshToken) {
    clearAuthSession();
    return null;
  }

  pendingAuthSessionRefresh ??= refreshCognitoSession(session)
    .then((nextSession) => {
      storeAuthSession(nextSession);
      return nextSession;
    })
    .catch(() => {
      clearAuthSession();
      return null;
    })
    .finally(() => {
      pendingAuthSessionRefresh = null;
    });

  return pendingAuthSessionRefresh;
}
