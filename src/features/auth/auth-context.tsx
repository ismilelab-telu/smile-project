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
  completeGoogleOAuthSignIn,
  confirmPasswordResetWithCognito,
  confirmSignUpWithCognito,
  requestPasswordResetWithCognito,
  resendConfirmationCodeWithCognito,
  revokeSession,
  signInWithCognito,
  signInWithUsername,
  startGoogleOAuthSignIn,
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
import type { Locale } from "@/features/localization/localization";

type AuthContextValue = {
  completeGoogleSignIn: (input: {
    code: string;
    redirectUri: string;
    state: string;
  }) => Promise<AuthSession>;
  confirmPasswordReset: (input: { code: string; email: string; password: string }) => Promise<void>;
  confirmSignUp: (input: { code: string; email: string; password: string }) => Promise<void>;
  getFreshSession: (options?: { force?: boolean }) => Promise<AuthSession | null>;
  isAuthenticated: boolean;
  isReady: boolean;
  resendConfirmationCode: (input: { email: string; locale?: Locale }) => Promise<{
    cooldownSeconds?: number;
    nextAllowedAt?: number;
  }>;
  requestPasswordReset: (input: { email: string; locale?: Locale }) => Promise<{
    destination?: string;
  }>;
  session: AuthSession | null;
  signIn: (input: SignInInput) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  startGoogleSignIn: (input: { redirectUri: string }) => Promise<{
    authorizationUrl: string;
    expiresAt?: number;
  }>;
  signUp: (input: { email: string; locale?: Locale; name: string }) => Promise<{
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

  const startGoogleSignIn = useCallback(async (input: { redirectUri: string }) => {
    invalidateStoredAuthSessionRefresh();

    return startGoogleOAuthSignIn(input);
  }, []);

  const completeGoogleSignIn = useCallback(
    async (input: { code: string; redirectUri: string; state: string }) => {
      invalidateStoredAuthSessionRefresh();

      const nextSession = await completeGoogleOAuthSignIn(input);
      storeAuthSession(nextSession);
      setSession(nextSession);

      return nextSession;
    },
    [],
  );

  const signUp = useCallback(async (input: { email: string; locale?: Locale; name: string }) => {
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

  const requestPasswordReset = useCallback(async (input: { email: string; locale?: Locale }) => {
    const response = await requestPasswordResetWithCognito(input);

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

  const resendConfirmationCode = useCallback(async (input: { email: string; locale?: Locale }) => {
    return resendConfirmationCodeWithCognito(input);
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
      completeGoogleSignIn,
      signIn,
      signOut,
      startGoogleSignIn,
      signUp,
    }),
    [
      completeGoogleSignIn,
      confirmPasswordReset,
      confirmSignUp,
      getFreshSession,
      isReady,
      resendConfirmationCode,
      requestPasswordReset,
      session,
      signIn,
      signOut,
      startGoogleSignIn,
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
