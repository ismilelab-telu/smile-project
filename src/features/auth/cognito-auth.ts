import { createAuthSession, type AuthSession } from "./auth-session";
import { getLearningBackendUrl } from "@/lib/learning-backend-url";

type BackendSignUpResponse = {
  CodeDeliveryDetails?: {
    AttributeName?: string;
    DeliveryMedium?: string;
    Destination?: string;
  };
  UserConfirmed?: boolean;
};

type CognitoAuthResult = {
  AccessToken?: string;
  ExpiresIn?: number;
  IdToken?: string;
  RefreshToken?: string;
};

type CognitoCodeDeliveryResponse = Pick<BackendSignUpResponse, "CodeDeliveryDetails">;
type AuthRequestLocale = "id" | "en";

type LearningBackendAuthResponse = {
  authenticationResult?: CognitoAuthResult;
  authorizationUrl?: string;
  code?: string;
  cooldownSeconds?: number;
  expiresAt?: number;
  message?: string;
  nextAllowedAt?: number;
  retryAfterSeconds?: number;
};

export class CognitoAuthError extends Error {
  code: string;
  nextAllowedAt?: number;
  retryAfterSeconds?: number;

  constructor(
    code: string,
    message: string,
    details: { nextAllowedAt?: number; retryAfterSeconds?: number } = {},
  ) {
    super(message);
    this.name = "CognitoAuthError";
    this.code = code;
    this.nextAllowedAt = details.nextAllowedAt;
    this.retryAfterSeconds = details.retryAfterSeconds;
  }
}

export async function signUpWithCognito({
  email,
  locale,
  name,
}: {
  email: string;
  locale?: AuthRequestLocale;
  name: string;
}) {
  const response = await fetch(`${requireLearningBackendAuthUrl()}/auth/sign-up/start`, {
    body: JSON.stringify({ email, locale, name }),
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json().catch(() => ({}))) as BackendSignUpResponse &
    LearningBackendAuthResponse;

  if (!response.ok) {
    const code = responseBody.code ?? "CognitoError";
    throw new CognitoAuthError(code, responseBody.message ?? getFallbackCognitoErrorMessage(code), {
      nextAllowedAt: responseBody.nextAllowedAt,
      retryAfterSeconds: responseBody.retryAfterSeconds,
    });
  }

  return responseBody;
}

export async function confirmSignUpWithCognito({
  code,
  email,
  password,
}: {
  code: string;
  email: string;
  password: string;
}) {
  const response = await fetch(`${requireLearningBackendAuthUrl()}/auth/confirmation/confirm`, {
    body: JSON.stringify({ code, email, password }),
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json().catch(() => ({}))) as LearningBackendAuthResponse;

  if (!response.ok) {
    const errorCode = responseBody.code ?? "CognitoError";
    throw new CognitoAuthError(
      errorCode,
      responseBody.message ?? getFallbackCognitoErrorMessage(errorCode),
      {
        nextAllowedAt: responseBody.nextAllowedAt,
        retryAfterSeconds: responseBody.retryAfterSeconds,
      },
    );
  }
}

export async function resendConfirmationCodeWithCognito({
  email,
  locale,
}: {
  email: string;
  locale?: AuthRequestLocale;
}) {
  const response = await fetch(`${requireLearningBackendAuthUrl()}/auth/confirmation/resend`, {
    body: JSON.stringify({ email, locale }),
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json().catch(() => ({}))) as LearningBackendAuthResponse;

  if (!response.ok) {
    const code = responseBody.code ?? "CognitoError";
    throw new CognitoAuthError(code, responseBody.message ?? getFallbackCognitoErrorMessage(code), {
      nextAllowedAt: responseBody.nextAllowedAt,
      retryAfterSeconds: responseBody.retryAfterSeconds,
    });
  }

  return {
    cooldownSeconds: responseBody.cooldownSeconds,
    nextAllowedAt: responseBody.nextAllowedAt,
  };
}

export async function requestPasswordResetWithCognito({
  email,
  locale,
}: {
  email: string;
  locale?: AuthRequestLocale;
}) {
  const response = await fetch(`${requireLearningBackendAuthUrl()}/auth/password-reset/request`, {
    body: JSON.stringify({ email, locale }),
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json().catch(() => ({}))) as CognitoCodeDeliveryResponse &
    LearningBackendAuthResponse;

  if (!response.ok) {
    const code = responseBody.code ?? "CognitoError";
    throw new CognitoAuthError(code, responseBody.message ?? getFallbackCognitoErrorMessage(code), {
      nextAllowedAt: responseBody.nextAllowedAt,
      retryAfterSeconds: responseBody.retryAfterSeconds,
    });
  }

  return responseBody;
}

export async function confirmPasswordResetWithCognito({
  code,
  email,
  password,
}: {
  code: string;
  email: string;
  password: string;
}) {
  const response = await fetch(`${requireLearningBackendAuthUrl()}/auth/password-reset/confirm`, {
    body: JSON.stringify({ code, email, password }),
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json().catch(() => ({}))) as LearningBackendAuthResponse;

  if (!response.ok) {
    const errorCode = responseBody.code ?? "CognitoError";
    throw new CognitoAuthError(
      errorCode,
      responseBody.message ?? getFallbackCognitoErrorMessage(errorCode),
      {
        nextAllowedAt: responseBody.nextAllowedAt,
        retryAfterSeconds: responseBody.retryAfterSeconds,
      },
    );
  }
}

export async function signInWithCognito({ email, password }: { email: string; password: string }) {
  const response = await fetch(`${requireLearningBackendAuthUrl()}/auth/email/sign-in`, {
    body: JSON.stringify({ email, password }),
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json().catch(() => ({}))) as LearningBackendAuthResponse;

  if (!response.ok) {
    const code = responseBody.code ?? "CognitoError";
    throw new CognitoAuthError(code, responseBody.message ?? getFallbackCognitoErrorMessage(code), {
      nextAllowedAt: responseBody.nextAllowedAt,
      retryAfterSeconds: responseBody.retryAfterSeconds,
    });
  }

  if (!responseBody.authenticationResult) {
    throw new CognitoAuthError("CognitoError", "Backend did not return a complete auth session.");
  }

  return createAuthSession({
    authResult: responseBody.authenticationResult,
    fallbackEmail: email,
  });
}

export async function signInWithUsername({
  password,
  username,
}: {
  password: string;
  username: string;
}) {
  const response = await fetch(`${requireLearningBackendAuthUrl()}/auth/username/sign-in`, {
    body: JSON.stringify({ password, username }),
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json().catch(() => ({}))) as LearningBackendAuthResponse;

  if (!response.ok) {
    const code = responseBody.code ?? "CognitoError";
    throw new CognitoAuthError(code, responseBody.message ?? getFallbackCognitoErrorMessage(code), {
      nextAllowedAt: responseBody.nextAllowedAt,
      retryAfterSeconds: responseBody.retryAfterSeconds,
    });
  }

  if (!responseBody.authenticationResult) {
    throw new CognitoAuthError("CognitoError", "Backend did not return a complete auth session.");
  }

  return createAuthSession({
    authResult: responseBody.authenticationResult,
    fallbackName: username,
  });
}

export async function startGoogleOAuthSignIn({ redirectUri }: { redirectUri: string }) {
  const response = await fetch(`${requireLearningBackendAuthUrl()}/auth/oauth/google/start`, {
    body: JSON.stringify({ redirectUri }),
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json().catch(() => ({}))) as LearningBackendAuthResponse;

  if (!response.ok) {
    const code = responseBody.code ?? "CognitoError";
    throw new CognitoAuthError(code, responseBody.message ?? getFallbackCognitoErrorMessage(code), {
      nextAllowedAt: responseBody.nextAllowedAt,
      retryAfterSeconds: responseBody.retryAfterSeconds,
    });
  }

  if (!responseBody.authorizationUrl) {
    throw new CognitoAuthError("CognitoError", "Backend did not return a Google sign-in URL.");
  }

  return {
    authorizationUrl: responseBody.authorizationUrl,
    expiresAt: responseBody.expiresAt,
  };
}

export async function completeGoogleOAuthSignIn({
  code,
  redirectUri,
  state,
}: {
  code: string;
  redirectUri: string;
  state: string;
}) {
  const response = await fetch(`${requireLearningBackendAuthUrl()}/auth/oauth/google/callback`, {
    body: JSON.stringify({ code, redirectUri, state }),
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json().catch(() => ({}))) as LearningBackendAuthResponse;

  if (!response.ok) {
    const errorCode = responseBody.code ?? "CognitoError";
    throw new CognitoAuthError(
      errorCode,
      responseBody.message ?? getFallbackCognitoErrorMessage(errorCode),
      {
        nextAllowedAt: responseBody.nextAllowedAt,
        retryAfterSeconds: responseBody.retryAfterSeconds,
      },
    );
  }

  if (!responseBody.authenticationResult) {
    throw new CognitoAuthError("CognitoError", "Backend did not return a complete auth session.");
  }

  return createAuthSession({
    authResult: responseBody.authenticationResult,
  });
}

export async function bootstrapCognitoSession() {
  const response = await fetch(`${requireLearningBackendAuthUrl()}/auth/session/bootstrap`, {
    body: JSON.stringify({}),
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json().catch(() => ({}))) as LearningBackendAuthResponse;

  if (!response.ok) {
    const code = responseBody.code ?? "CognitoError";
    throw new CognitoAuthError(code, responseBody.message ?? getFallbackCognitoErrorMessage(code), {
      nextAllowedAt: responseBody.nextAllowedAt,
      retryAfterSeconds: responseBody.retryAfterSeconds,
    });
  }

  if (!responseBody.authenticationResult) {
    throw new CognitoAuthError("CognitoError", "Backend did not return a complete auth session.");
  }

  return createAuthSession({
    authResult: responseBody.authenticationResult,
  });
}

export async function refreshCognitoSession(session: AuthSession) {
  const body = {
    userSub: session.user.sub,
  };
  const response = await fetch(`${requireLearningBackendAuthUrl()}/auth/session/refresh`, {
    body: JSON.stringify(body),
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json().catch(() => ({}))) as LearningBackendAuthResponse;

  if (!response.ok) {
    const code = responseBody.code ?? "CognitoError";
    throw new CognitoAuthError(code, responseBody.message ?? getFallbackCognitoErrorMessage(code), {
      nextAllowedAt: responseBody.nextAllowedAt,
      retryAfterSeconds: responseBody.retryAfterSeconds,
    });
  }

  if (!responseBody.authenticationResult) {
    throw new CognitoAuthError("CognitoError", "Backend did not return a complete auth session.");
  }

  return createAuthSession({
    authResult: responseBody.authenticationResult,
    fallbackEmail: session.user.email,
    fallbackName: session.user.name,
  });
}

export async function revokeSession() {
  const response = await fetch(`${requireLearningBackendAuthUrl()}/auth/session/revoke`, {
    body: JSON.stringify({}),
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json().catch(() => ({}))) as LearningBackendAuthResponse;

  if (!response.ok) {
    const code = responseBody.code ?? "CognitoError";
    throw new CognitoAuthError(code, responseBody.message ?? getFallbackCognitoErrorMessage(code), {
      nextAllowedAt: responseBody.nextAllowedAt,
      retryAfterSeconds: responseBody.retryAfterSeconds,
    });
  }
}

function requireLearningBackendAuthUrl() {
  try {
    return getLearningBackendUrl();
  } catch {
    throw new CognitoAuthError(
      "AuthNotConfigured",
      "Auth belum dikonfigurasi. Isi env URL backend learning.",
    );
  }
}

function getFallbackCognitoErrorMessage(code: string) {
  if (code === "UserNotConfirmedException") {
    return "Akun belum dikonfirmasi.";
  }

  if (code === "NotAuthorizedException") {
    return "Username/email atau password belum sesuai.";
  }

  return "Auth request gagal.";
}
