export const googleOAuthCallbackPath = "/auth/callback/google";
export const microsoftOAuthCallbackPath = "/auth/callback/microsoft";

const googleOAuthReturnToStorageKey = "smile-google-oauth-return-to";
const microsoftOAuthReturnToStorageKey = "smile-microsoft-oauth-return-to";
type OAuthProvider = "google" | "microsoft";

const oauthProviderConfig: Record<
  OAuthProvider,
  {
    callbackPath: string;
    storageKey: string;
  }
> = {
  google: {
    callbackPath: googleOAuthCallbackPath,
    storageKey: googleOAuthReturnToStorageKey,
  },
  microsoft: {
    callbackPath: microsoftOAuthCallbackPath,
    storageKey: microsoftOAuthReturnToStorageKey,
  },
};

export function getGoogleOAuthRedirectUri() {
  return getOAuthRedirectUri("google");
}

export function getMicrosoftOAuthRedirectUri() {
  return getOAuthRedirectUri("microsoft");
}

export function getOAuthRedirectUri(provider: OAuthProvider) {
  return `${window.location.origin}${oauthProviderConfig[provider].callbackPath}`;
}

export function storeGoogleOAuthReturnTo(href: string) {
  storeOAuthReturnTo("google", href);
}

export function storeMicrosoftOAuthReturnTo(href: string) {
  storeOAuthReturnTo("microsoft", href);
}

export function storeOAuthReturnTo(provider: OAuthProvider, href: string) {
  const returnTo = getSafeOAuthReturnTo(href, "/learn");

  try {
    window.sessionStorage.setItem(oauthProviderConfig[provider].storageKey, returnTo);
  } catch {
    // Session storage can be unavailable in restricted browser contexts.
  }
}

export function consumeGoogleOAuthReturnTo(fallback = "/learn") {
  return consumeOAuthReturnTo("google", fallback);
}

export function consumeMicrosoftOAuthReturnTo(fallback = "/learn") {
  return consumeOAuthReturnTo("microsoft", fallback);
}

export function consumeOAuthReturnTo(provider: OAuthProvider, fallback = "/learn") {
  try {
    const { storageKey } = oauthProviderConfig[provider];
    const storedValue = window.sessionStorage.getItem(storageKey);
    window.sessionStorage.removeItem(storageKey);

    return getSafeOAuthReturnTo(storedValue ?? "", fallback);
  } catch {
    return fallback;
  }
}

function getSafeOAuthReturnTo(value: string, fallback: string) {
  try {
    const url = new URL(value, window.location.origin);

    if (
      url.origin !== window.location.origin ||
      url.pathname === googleOAuthCallbackPath ||
      url.pathname === microsoftOAuthCallbackPath
    ) {
      return fallback;
    }

    if (url.pathname === "/login" || url.pathname === "/register") {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
