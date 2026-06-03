import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  confirmPasswordResetWithCognito,
  confirmSignUpWithCognito,
  requestPasswordResetWithCognito,
  resendConfirmationCodeWithCognito,
  revokeSession,
  signInWithCognito,
  signInWithUsername,
  signUpWithCognito,
} from "./cognito-auth";
import {
  authSessionChangedEvent,
  clearAuthSession,
  getStoredAuthSession,
  isAuthSessionExpired,
  storeAuthSession,
  type AuthSession,
} from "./auth-session";
import {
  authRefreshSkewMs,
  getFreshStoredAuthSession,
  invalidateStoredAuthSessionRefresh,
} from "./auth-session-refresh";

type AuthContextValue = {
  confirmPasswordReset: (input: { code: string; email: string; password: string }) => Promise<void>;
  confirmSignUp: (input: { code: string; email: string; password: string }) => Promise<void>;
  getFreshSession: (options?: { force?: boolean }) => Promise<AuthSession | null>;
  isAuthenticated: boolean;
  isReady: boolean;
  resendConfirmationCode: (email: string) => Promise<{
    cooldownSeconds?: number;
    nextAllowedAt?: number;
  }>;
  requestPasswordReset: (email: string) => Promise<{
    destination?: string;
  }>;
  session: AuthSession | null;
  signIn: (input: SignInInput) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  signUp: (input: { email: string; name: string }) => Promise<{
    cooldownSeconds?: number;
    destination?: string;
    nextAllowedAt?: number;
    userConfirmed: boolean;
  }>;
};

type SignInInput = {
  identifier: string;
  method: "email" | "username";
  password: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    getStoredAuthSession({ includeExpired: true }),
  );
  const [isReady, setIsReady] = useState(false);

  const syncSessionFromStorage = useCallback(() => {
    const storedSession = getStoredAuthSession({ includeExpired: true });
    setSession(storedSession);
  }, []);

  const getFreshSession = useCallback(
    async (options: { force?: boolean } = {}) => {
      const freshSession = await getFreshStoredAuthSession(options);
      syncSessionFromStorage();

      return freshSession;
    },
    [syncSessionFromStorage],
  );

  useEffect(() => {
    let isActive = true;

    void getFreshStoredAuthSession().finally(() => {
      if (isActive) {
        syncSessionFromStorage();
        setIsReady(true);
      }
    });

    return () => {
      isActive = false;
    };
  }, [syncSessionFromStorage]);

  useEffect(() => {
    window.addEventListener(authSessionChangedEvent, syncSessionFromStorage);

    return () => {
      window.removeEventListener(authSessionChangedEvent, syncSessionFromStorage);
    };
  }, [syncSessionFromStorage]);

  useEffect(() => {
    if (!isReady || !session) {
      return;
    }

    const refreshDelayMs = Math.max(0, session.expiresAt - Date.now() - authRefreshSkewMs);
    const refreshTimer = window.setTimeout(() => {
      void getFreshSession();
    }, refreshDelayMs);

    return () => {
      window.clearTimeout(refreshTimer);
    };
  }, [getFreshSession, isReady, session]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const refreshVisibleSession = () => {
      if (document.visibilityState !== "hidden") {
        void getFreshSession();
      }
    };

    window.addEventListener("focus", refreshVisibleSession);
    document.addEventListener("visibilitychange", refreshVisibleSession);

    return () => {
      window.removeEventListener("focus", refreshVisibleSession);
      document.removeEventListener("visibilitychange", refreshVisibleSession);
    };
  }, [getFreshSession, isReady]);

  const signIn = useCallback(async (input: SignInInput) => {
    invalidateStoredAuthSessionRefresh();

    const nextSession =
      input.method === "username"
        ? await signInWithUsername({
            password: input.password,
            username: input.identifier,
          })
        : await signInWithCognito({
            email: input.identifier,
            password: input.password,
          });

    storeAuthSession(nextSession);
    setSession(nextSession);

    return nextSession;
  }, []);

  const signUp = useCallback(async (input: { email: string; name: string }) => {
    invalidateStoredAuthSessionRefresh();
    clearAuthSession();
    setSession(null);

    const response = await signUpWithCognito(input);

    return {
      cooldownSeconds: response.cooldownSeconds,
      destination: response.CodeDeliveryDetails?.Destination,
      nextAllowedAt: response.nextAllowedAt,
      userConfirmed: response.UserConfirmed === true,
    };
  }, []);

  const confirmSignUp = useCallback(
    async (input: { code: string; email: string; password: string }) => {
      await confirmSignUpWithCognito(input);
    },
    [],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    const response = await requestPasswordResetWithCognito(email);

    return {
      destination: response.CodeDeliveryDetails?.Destination,
    };
  }, []);

  const confirmPasswordReset = useCallback(
    async (input: { code: string; email: string; password: string }) => {
      await confirmPasswordResetWithCognito(input);
    },
    [],
  );

  const resendConfirmationCode = useCallback(async (email: string) => {
    return resendConfirmationCodeWithCognito(email);
  }, []);

  const signOut = useCallback(async () => {
    const storedSession = getStoredAuthSession({ includeExpired: true });
    invalidateStoredAuthSessionRefresh();

    if (storedSession) {
      await revokeSession();
    }

    clearAuthSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      confirmPasswordReset,
      confirmSignUp,
      getFreshSession,
      isAuthenticated: Boolean(session && !isAuthSessionExpired(session)),
      isReady,
      resendConfirmationCode,
      requestPasswordReset,
      session,
      signIn,
      signOut,
      signUp,
    }),
    [
      confirmPasswordReset,
      confirmSignUp,
      getFreshSession,
      isReady,
      resendConfirmationCode,
      requestPasswordReset,
      session,
      signIn,
      signOut,
      signUp,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
