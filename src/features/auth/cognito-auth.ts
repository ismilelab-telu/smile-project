import { createAuthSession, type AuthSession } from "./auth-session";

type ViteImportMeta = ImportMeta & {
  env?: {
    VITE_COGNITO_CLIENT_ID?: string;
    VITE_COGNITO_REGION?: string;
    VITE_COGNITO_USER_POOL_ID?: string;
  };
};

type CognitoTarget = "ConfirmSignUp" | "InitiateAuth" | "ResendConfirmationCode" | "SignUp";

type CognitoErrorBody = {
  __type?: string;
  code?: string;
  message?: string;
};

type CognitoSignUpResponse = {
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

export class CognitoAuthError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CognitoAuthError";
    this.code = code;
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

export async function signUpWithCognito({
  email,
  name,
  password,
}: {
  email: string;
  name: string;
  password: string;
}) {
  const config = requireCognitoConfig();

  return cognitoRequest<CognitoSignUpResponse>("SignUp", {
    ClientId: config.clientId,
    Password: password,
    UserAttributes: [
      { Name: "email", Value: email },
      { Name: "name", Value: name },
    ],
    Username: email,
  });
}

export async function confirmSignUpWithCognito({ code, email }: { code: string; email: string }) {
  const config = requireCognitoConfig();

  await cognitoRequest("ConfirmSignUp", {
    ClientId: config.clientId,
    ConfirmationCode: code,
    Username: email,
  });
}

export async function resendConfirmationCodeWithCognito(email: string) {
  const config = requireCognitoConfig();

  await cognitoRequest("ResendConfirmationCode", {
    ClientId: config.clientId,
    Username: email,
  });
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
    return "Email atau password belum sesuai.";
  }

  return "Auth request gagal.";
}
