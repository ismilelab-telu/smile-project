export const googleOAuthCallbackPath = "/auth/callback/google";

const googleOAuthReturnToStorageKey = "smile-google-oauth-return-to";

export function getGoogleOAuthRedirectUri() {
  return `${window.location.origin}${googleOAuthCallbackPath}`;
}

export function storeGoogleOAuthReturnTo(href: string) {
  const returnTo = getSafeGoogleOAuthReturnTo(href, "/learn");

  try {
    window.sessionStorage.setItem(googleOAuthReturnToStorageKey, returnTo);
  } catch {
    // Session storage can be unavailable in restricted browser contexts.
  }
}

export function consumeGoogleOAuthReturnTo(fallback = "/learn") {
  try {
    const storedValue = window.sessionStorage.getItem(googleOAuthReturnToStorageKey);
    window.sessionStorage.removeItem(googleOAuthReturnToStorageKey);

    return getSafeGoogleOAuthReturnTo(storedValue ?? "", fallback);
  } catch {
    return fallback;
  }
}

function getSafeGoogleOAuthReturnTo(value: string, fallback: string) {
  try {
    const url = new URL(value, window.location.origin);

    if (url.origin !== window.location.origin || url.pathname === googleOAuthCallbackPath) {
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
