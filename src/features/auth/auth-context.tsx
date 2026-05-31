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
  confirmSignUpWithCognito,
  refreshCognitoSession,
  resendConfirmationCodeWithCognito,
  signInWithCognito,
  signUpWithCognito,
} from "./cognito-auth";
import {
  clearAuthSession,
  getStoredAuthSession,
  isAuthSessionExpired,
  storeAuthSession,
  type AuthSession,
} from "./auth-session";

type AuthContextValue = {
  confirmSignUp: (input: { code: string; email: string }) => Promise<void>;
  isAuthenticated: boolean;
  isReady: boolean;
  resendConfirmationCode: (email: string) => Promise<void>;
  session: AuthSession | null;
  signIn: (input: { email: string; password: string }) => Promise<AuthSession>;
  signOut: () => void;
  signUp: (input: { email: string; name: string; password: string }) => Promise<{
    destination?: string;
    userConfirmed: boolean;
  }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    getStoredAuthSession({ includeExpired: true }),
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isActive = true;
    const storedSession = getStoredAuthSession({ includeExpired: true });

    if (!storedSession) {
      setSession(null);
      setIsReady(true);
      return;
    }

    if (!isAuthSessionExpired(storedSession)) {
      setSession(storedSession);
      setIsReady(true);
      return;
    }

    if (!storedSession.refreshToken) {
      clearAuthSession();
      setSession(null);
      setIsReady(true);
      return;
    }

    void refreshCognitoSession(storedSession)
      .then((nextSession) => {
        if (!isActive) {
          return;
        }

        storeAuthSession(nextSession);
        setSession(nextSession);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        clearAuthSession();
        setSession(null);
      })
      .finally(() => {
        if (isActive) {
          setIsReady(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const signIn = useCallback(async (input: { email: string; password: string }) => {
    const nextSession = await signInWithCognito(input);

    storeAuthSession(nextSession);
    setSession(nextSession);

    return nextSession;
  }, []);

  const signUp = useCallback(async (input: { email: string; name: string; password: string }) => {
    const response = await signUpWithCognito(input);

    return {
      destination: response.CodeDeliveryDetails?.Destination,
      userConfirmed: response.UserConfirmed === true,
    };
  }, []);

  const confirmSignUp = useCallback(async (input: { code: string; email: string }) => {
    await confirmSignUpWithCognito(input);
  }, []);

  const resendConfirmationCode = useCallback(async (email: string) => {
    await resendConfirmationCodeWithCognito(email);
  }, []);

  const signOut = useCallback(() => {
    clearAuthSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      confirmSignUp,
      isAuthenticated: Boolean(session && !isAuthSessionExpired(session)),
      isReady,
      resendConfirmationCode,
      session,
      signIn,
      signOut,
      signUp,
    }),
    [confirmSignUp, isReady, resendConfirmationCode, session, signIn, signOut, signUp],
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
