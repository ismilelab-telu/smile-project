import { createAuthSession, type AuthSession } from "./auth-session";
import { getLearningBackendUrl } from "@/lib/learning-backend-url";

type ViteImportMeta = ImportMeta & {
  env?: {
    VITE_COGNITO_CLIENT_ID?: string;
    VITE_COGNITO_REGION?: string;
    VITE_COGNITO_USER_POOL_ID?: string;
  };
};

type CognitoTarget = "InitiateAuth";

type CognitoErrorBody = {
  __type?: string;
  code?: string;
  message?: string;
};

type BackendSignUpResponse = {
  CodeDeliveryDetails?: {
    AttributeName?: string;
    DeliveryMedium?: string;
    Destination?: string;
  };
  UserConfirmed?: boolean;
};

type CognitoInitiateAuthResponse = {
  AuthenticationResult?: {
    AccessToken?: string;
    ExpiresIn?: number;
    IdToken?: string;
    RefreshToken?: string;
  };
};

type LearningBackendAuthResponse = {
  authenticationResult?: CognitoInitiateAuthResponse["AuthenticationResult"];
  code?: string;
  cooldownSeconds?: number;
  email?: string;
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

export function getCognitoConfig() {
  const env = (import.meta as ViteImportMeta).env;
  const region = env?.VITE_COGNITO_REGION?.trim() ?? "";
  const userPoolId = env?.VITE_COGNITO_USER_POOL_ID?.trim() ?? "";
  const clientId = env?.VITE_COGNITO_CLIENT_ID?.trim() ?? "";

  return {
    clientId,
    isConfigured: Boolean(region && userPoolId && clientId),
    region,
    userPoolId,
  };
}

export async function signUpWithCognito({ email, name }: { email: string; name: string }) {
  requireCognitoConfig();

  const response = await fetch(`${getLearningBackendUrl()}/auth/sign-up/start`, {
    body: JSON.stringify({ email, name }),
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
  const response = await fetch(`${getLearningBackendUrl()}/auth/confirmation/confirm`, {
    body: JSON.stringify({ code, email, password }),
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
    );
  }
}

export async function resendConfirmationCodeWithCognito(email: string) {
  const response = await fetch(`${getLearningBackendUrl()}/auth/confirmation/resend`, {
    body: JSON.stringify({ email }),
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

export async function signInWithCognito({ email, password }: { email: string; password: string }) {
  const config = requireCognitoConfig();
  const response = await cognitoRequest<CognitoInitiateAuthResponse>("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: {
      PASSWORD: password,
      USERNAME: email,
    },
    ClientId: config.clientId,
  });

  return createAuthSession({
    authResult: response.AuthenticationResult ?? {},
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
  const response = await fetch(`${getLearningBackendUrl()}/auth/username/resolve`, {
    body: JSON.stringify({ username }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json().catch(() => ({}))) as LearningBackendAuthResponse;

  if (!response.ok) {
    const code = responseBody.code ?? "CognitoError";
    throw new CognitoAuthError(code, responseBody.message ?? getFallbackCognitoErrorMessage(code));
  }

  const email = responseBody.email?.trim();
  if (!email) {
    throw new CognitoAuthError("CognitoError", "Backend did not return a sign-in email.");
  }

  const config = requireCognitoConfig();
  const cognitoResponse = await cognitoRequest<CognitoInitiateAuthResponse>("InitiateAuth", {
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: {
      PASSWORD: password,
      USERNAME: email,
    },
    ClientId: config.clientId,
  });

  return createAuthSession({
    authResult: cognitoResponse.AuthenticationResult ?? {},
    fallbackEmail: email,
    fallbackName: username,
  });
}

export async function refreshCognitoSession(session: AuthSession) {
  const config = requireCognitoConfig();
  const response = await cognitoRequest<CognitoInitiateAuthResponse>("InitiateAuth", {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    AuthParameters: {
      REFRESH_TOKEN: session.refreshToken,
    },
    ClientId: config.clientId,
  });

  return createAuthSession({
    authResult: response.AuthenticationResult ?? {},
    fallbackEmail: session.user.email,
    fallbackName: session.user.name,
    previousRefreshToken: session.refreshToken,
  });
}

function requireCognitoConfig() {
  const config = getCognitoConfig();

  if (!config.isConfigured) {
    throw new CognitoAuthError(
      "AuthNotConfigured",
      "Auth belum dikonfigurasi. Jalankan deploy backend lalu isi env Cognito.",
    );
  }

  return config;
}

async function cognitoRequest<T>(target: CognitoTarget, body: unknown): Promise<T> {
  const config = requireCognitoConfig();
  const response = await fetch(`https://cognito-idp.${config.region}.amazonaws.com/`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/x-amz-json-1.1",
      "x-amz-target": `AWSCognitoIdentityProviderService.${target}`,
    },
    method: "POST",
  });

  const responseBody = (await response.json().catch(() => ({}))) as CognitoErrorBody;

  if (!response.ok) {
    const code = getCognitoErrorCode(responseBody);
    throw new CognitoAuthError(code, responseBody.message ?? getFallbackCognitoErrorMessage(code));
  }

  return responseBody as T;
}

function getCognitoErrorCode(body: CognitoErrorBody) {
  return (body.__type ?? body.code ?? "CognitoError").split("#").pop() ?? "CognitoError";
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
