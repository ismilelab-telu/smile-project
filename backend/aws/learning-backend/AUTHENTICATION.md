# Authentication Developer Documentation

Last audited: 2026-06-03

This document describes the current authentication system in Smile Project from the code that exists today. The app does not use Cognito Hosted UI or Amplify. The browser keeps Cognito bearer tokens in memory, the backend stores the Cognito refresh token in a signed HttpOnly refresh-session cookie, Amazon Cognito issues tokens, and the AWS learning backend owns custom sign-up policy, username reservation, verification email delivery, learning-progress sync, and protected guided-download backend work.

## Source Map

| Area                                                 | Files                                                                                                             |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Auth UI modal and form validation                    | `src/pages/AuthPage.tsx`                                                                                          |
| React auth state and context API                     | `src/features/auth/auth-context.tsx`                                                                              |
| Cognito/backend auth requests                        | `src/features/auth/cognito-auth.ts`                                                                               |
| Browser session shape, storage, JWT decoding         | `src/features/auth/auth-session.ts`                                                                               |
| Token refresh orchestration                          | `src/features/auth/auth-session-refresh.ts`                                                                       |
| App routing and auth modal routes                    | `src/app/App.tsx`                                                                                                 |
| Learning route auth gate                             | `src/pages/LearningPage.tsx`                                                                                      |
| Learning header login/register/profile/logout UI     | `src/features/learning/components/LearningHeader.tsx`                                                             |
| Guided-download backend client                       | `src/features/learning/api/learning-backend.ts`                                                                   |
| Cloudflare Pages backend proxy                       | `functions/api/learning-backend/[[path]].ts`, `src/features/learning/server/learning-backend-proxy.ts`            |
| Learning progress account sync                       | `src/features/learning/progress/learning-progress.ts`, `src/features/learning/progress/learning-progress-sync.ts` |
| Backend Lambda, Cognito triggers, token verification | `backend/aws/learning-backend/src/app.py`                                                                         |
| AWS auth infrastructure                              | `backend/aws/learning-backend/template.yaml`, `backend/aws/learning-backend/samconfig.toml`                       |
| Backend auth README                                  | `backend/aws/learning-backend/README.md`                                                                          |
| Cloudflare Pages deploy config                       | `wrangler.jsonc`, `public/_headers`, `public/_redirects`                                                          |

## System Model

The system has four auth-related layers:

1. The React app renders `/login` and `/register` as a shared modal over the current app route.
2. The React auth context keeps the Cognito bearer session in browser module memory and exposes `signIn`, `signUp`, `confirmSignUp`, `resendConfirmationCode`, `getFreshSession`, and `signOut`.
3. Cognito issues ID, access, and refresh tokens through the confidential backend-owned app client.
4. The learning backend is exposed by a Lambda Function URL, but production non-health routes require the Cloudflare Pages proxy secret before route handlers run. It verifies Cognito bearer tokens for protected routes and runs custom backend-owned sign-up endpoints for registration.

Important non-goals in the current implementation:

- No Cognito Hosted UI.
- No Amplify auth client.
- No JavaScript-readable refresh-token storage; reload persistence uses a signed HttpOnly refresh-session cookie.
- No Cognito bearer tokens persisted to browser storage.
- No MFA flow in the frontend.

## Frontend Configuration

The frontend reads this Vite env value:

| Env                         | Used by                                           | Meaning                                                                                                                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_LEARNING_BACKEND_URL` | `src/lib/learning-backend-url.ts`, auth/API calls | Base URL for the learning backend. Required. Production should use the same-origin Cloudflare Pages proxy path `/api/learning-backend`; local/dev may use the Lambda Function URL. If absent, backend-dependent auth and learning requests fail closed. Trailing slashes are stripped. |

The frontend no longer calls Cognito directly for password sign-in, username sign-in, password reset, sign-up confirmation, or token refresh. Cognito region, user pool ID, app client ID, and app client secret are backend-owned deployment values.

`.env.local` may contain older Cognito keys from previous builds, but current frontend auth only requires `VITE_LEARNING_BACKEND_URL`. Production and preview deploys must set it explicitly.

## Auth Context API

`AuthProvider` wraps the whole app in `src/app/App.tsx`, inside `LocalizationProvider` and outside app routes. It exposes:

| Field                           | Meaning                                                                                                                |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `session`                       | Current `AuthSession` or `null`. May include an expired session during startup while refresh is attempted.             |
| `isReady`                       | `true` after the initial in-memory session refresh/check finishes. Learning routes use this before showing auth gates. |
| `isAuthenticated`               | `true` only when a session exists and is not expired under the default 30 second expiry skew.                          |
| `signIn(input)`                 | Signs in with email or username and keeps the session in memory.                                                       |
| `signUp(input)`                 | Clears any current session, starts backend-owned sign-up, and returns masked delivery details.                         |
| `confirmSignUp(input)`          | Confirms backend-owned sign-up. It does not store a session by itself. The UI signs in after confirmation.             |
| `resendConfirmationCode(email)` | Resends the backend-owned verification code and returns cooldown details.                                              |
| `requestPasswordReset(email)`   | Starts Cognito forgot-password and returns masked delivery details.                                                    |
| `confirmPasswordReset(input)`   | Confirms Cognito forgot-password with the reset code and new password.                                                 |
| `getFreshSession(options)`      | Returns a usable in-memory session, refreshing it if needed or forced.                                                 |
| `signOut()`                     | Clears the in-memory session plus legacy auth storage and sets `session` to `null`.                                    |

`AuthProvider` listens for the custom `smile-auth-session-changed` browser event so state updates when helper functions write or clear the in-memory auth session.

## Route Entry Points

Auth is exposed in three places:

- `/login` opens `AuthPage` in login mode.
- `/register` opens `AuthPage` in register mode.
- `LearningHeader` shows `Login / Register` links for guests and profile plus logout for authenticated users.

Auth routes are modal routes. When a user opens `/login` or `/register`, `AppRoutes` keeps the previous non-auth route as `backgroundPath`, renders that route underneath, and overlays `AuthPage`.

`AuthPage` guards against using `/login` or `/register` as a close or success target. If that happens, it falls back to `/learn`.

## Learning Auth Gates

Only lessons containing a `guided-download` exercise require auth today.

There are two gates:

1. Link-click gate in `AppRoutes`: guest clicks to an auth-required learning lesson are intercepted before the URL changes. The current path stays visible and an auth modal opens with `successHref` set to the target lesson.
2. Direct-route gate in `LearningPage`: if the user lands directly on an auth-required lesson, the page waits for `isAuthReady`; if not authenticated, it renders the learning shell plus `AuthPage` with title `Sign in first` or `Masuk terlebih dahulu`.

When auth succeeds, `redirectAfterAuth()` pushes `successHref`, dispatches `popstate`, scrolls to top, and calls the optional `onAuthenticated` callback.

## Sign-In Flows

### Email Sign-In

Flow:

```text
AuthPage
  -> auth.signIn({ method: "email", identifier: email, password })
  -> signInWithCognito()
  -> POST /auth/email/sign-in with { email, password }
  -> backend calls Cognito AdminInitiateAuth ADMIN_USER_PASSWORD_AUTH with SECRET_HASH
  -> backend returns Cognito AuthenticationResult
  -> createAuthSession()
  -> storeAuthSession()
```

Request details:

- Frontend endpoint: `{VITE_LEARNING_BACKEND_URL}/auth/email/sign-in`
- Request body: normalized lowercase `email` plus `password`
- Backend Cognito flow: `ADMIN_USER_PASSWORD_AUTH` with `AuthParameters.USERNAME = email` and backend-generated `SECRET_HASH`

Email sign-in intentionally goes through the backend so the same app-level source and email cooldowns protect all password sign-in flows. The backend does not store the password. The Cognito app client is confidential and does not allow public `USER_PASSWORD_AUTH` or `USER_SRP_AUTH`, so knowing the app client ID is not enough to bypass backend rate limits.

### Username Sign-In

Flow:

```text
AuthPage
  -> auth.signIn({ method: "username", identifier: username, password })
  -> signInWithUsername()
  -> POST /auth/username/sign-in with { username, password }
  -> backend resolves confirmed username internally
  -> backend calls Cognito AdminInitiateAuth ADMIN_USER_PASSWORD_AUTH with the account email + password + SECRET_HASH
  -> backend returns Cognito AuthenticationResult only
  -> createAuthSession()
  -> storeAuthSession()
```

Username sign-in intentionally sends the password to the backend so the backend can resolve the display username without exposing the account email to the browser. The backend does not store the password. It uses the resolved email only inside the Cognito `AdminInitiateAuth` request, returns access/ID tokens, sets the refresh token in the signed HttpOnly cookie, and never returns the email lookup result. Pending username reservations and unknown usernames return the same generic `NotAuthorizedException`; unknown usernames still take the backend-owned Cognito auth path with a deterministic dummy Cognito username to reduce timing differences.

The deprecated backend `/auth/username/resolve` route no longer returns emails. It parses the request for compatibility and returns a generic sign-in failure if it is reached directly in local/dev or with the backend proxy secret. The production Cloudflare Pages proxy does not forward this route.

The UI defaults to username login. Users can toggle to email login with the field label action.

## Password Reset Flow

Password reset uses Cognito's forgot-password APIs and the existing Cognito custom email sender:

```text
AuthPage forgot-password action
  -> auth.requestPasswordReset(email)
  -> POST /auth/password-reset/request with { email }
  -> backend calls Cognito ForgotPassword
  -> AuthEmailSenderFunction sends the reset code through Resend
  -> AuthPage reset step collects code + new password
  -> auth.confirmPasswordReset({ email, code, password })
  -> POST /auth/password-reset/confirm with { email, code, password }
  -> backend calls Cognito ConfirmForgotPassword
  -> user signs in with the new password
```

The frontend requires an email address before starting reset. It does not resolve usernames to emails. Reset-copy and backend fallback responses are generic so they do not reveal whether an email is registered.

## Backend-Owned Registration Flow

Cognito public self-sign-up is disabled in the SAM template with `AdminCreateUserConfig.AllowAdminCreateUserOnly: true`. Registration is owned by the learning backend.

### Username Rules

Frontend and backend both enforce the same display username rules:

- Trim whitespace.
- Minimum 3 characters.
- Allowed characters: ASCII letters, numbers, dot, underscore, hyphen.
- Cannot start or end with dot, underscore, or hyphen.
- Backend stores `usernameKey` as lowercase for uniqueness.

The display username is stored in Cognito's `name` attribute. Cognito's actual username/sign-in username remains the email because the user pool uses `UsernameAttributes: [email]`.

### Password Rules

Frontend, backend, and Cognito policy are aligned:

- Minimum 12 characters.
- Must include lowercase and uppercase letters.
- Must include a number.
- Must include a symbol.

The frontend shows live password requirements. The backend validates the password again before creating the Cognito user. Cognito also enforces the same policy.

### Start Sign-Up

Flow:

```text
AuthPage register step
  -> auth.signUp({ email, name })
  -> POST /auth/sign-up/start
  -> backend normalizes email
  -> backend applies public auth rate limits by source and email
  -> backend checks Cognito AdminGetUser
  -> backend reserves username in UsernameReservationTable
  -> backend creates 6 digit code
  -> backend hashes code with salt and email
  -> backend stores pending sign-up in AuthCooldownTable
  -> backend sends email through Resend
  -> frontend enters confirmation step
```

Request:

```json
{
  "email": "student@example.com",
  "name": "student_one"
}
```

Response:

```json
{
  "ok": true,
  "cooldownSeconds": 30,
  "nextAllowedAt": 1780396830,
  "CodeDeliveryDetails": {
    "AttributeName": "email",
    "DeliveryMedium": "EMAIL",
    "Destination": "s***t@example.com"
  },
  "UserConfirmed": false
}
```

Current backend policy:

- Verification code length: 6 digits.
- Code TTL: 300 seconds.
- Resend/start cooldown: 30 seconds.
- Public auth endpoint cooldowns: sign-up source/email 5 seconds, username sign-in source/username 2 seconds, session refresh source/user-sub 2 seconds, confirmation source/email 3 seconds unless overridden by env.
- Max failed confirmation attempts: 5.
- Pending username reservation TTL: 24 hours.
- Auth cooldown table TTL for generic cooldown helpers: 1 hour.
- The raw code is not stored. `codeHash = sha256("{salt}:{email}:{code}")`.

If the submitted email already belongs to a Cognito user, `/auth/sign-up/start` returns the same confirmation-shaped response but does not reserve a username or send an email. This avoids revealing whether an email already has an account.

If the same email has an active pending sign-up and the cooldown has elapsed, a repeated start request reuses the original pending username instead of changing it. If the pending sign-up is no longer active, the backend releases the old pending username reservation and reserves the newly requested username.

### Confirm Sign-Up

Flow:

```text
AuthPage confirmation step
  -> auth.confirmSignUp({ email, code, password })
  -> POST /auth/confirmation/confirm
  -> backend validates password
  -> backend checks active pending sign-up
  -> backend checks max attempts
  -> backend compares hashed code
  -> backend AdminCreateUser with MessageAction SUPPRESS
  -> backend AdminSetUserPassword Permanent true
  -> backend marks username reservation confirmed
  -> backend deletes pending sign-up
  -> frontend signs in by email through backend-owned Cognito auth
```

Request:

```json
{
  "email": "student@example.com",
  "code": "123456",
  "password": "StrongPass1!"
}
```

Response:

```json
{
  "ok": true
}
```

The password is intentionally sent to the backend only during confirmation because the backend creates the Cognito user with admin APIs and sets the permanent password. The backend does not store the password in DynamoDB.

If `AdminCreateUser` succeeds but `AdminSetUserPassword` fails, the backend attempts to delete the newly created Cognito user to avoid a half-created account.

### Resend Confirmation Code

Flow:

```text
AuthPage confirmation step
  -> auth.resendConfirmationCode(email)
  -> POST /auth/confirmation/resend
  -> backend checks pending sign-up and cooldown
  -> backend creates a new code/salt/hash
  -> backend resets attempts to 0
  -> backend extends code TTL
  -> backend sends email through Resend
```

Request:

```json
{
  "email": "student@example.com"
}
```

Response:

```json
{
  "ok": true,
  "cooldownSeconds": 30,
  "nextAllowedAt": 1780396860
}
```

If no active pending sign-up exists, the endpoint still returns `ok` with cooldown details and does not reveal whether the email is registered or pending.

### Unconfirmed Account Handling

`AuthPage` handles `UserNotConfirmedException` from Cognito sign-in:

- If the user was trying username sign-in, the UI asks them to use email to enter the code.
- If the user was trying email sign-in, the UI switches to confirmation mode for that email.

This mainly protects legacy or future Cognito-native unconfirmed states. The current primary registration path is backend-owned and creates the Cognito user only after backend confirmation succeeds.

## Session Shape and Storage

`AuthSession` contains:

```ts
type AuthSession = {
  accessToken: string;
  expiresAt: number;
  idToken: string;
  refreshToken: string;
  user: {
    email: string;
    initials: string;
    name: string;
    sub: string;
  };
};
```

`createAuthSession()` requires both `IdToken` and `AccessToken`. It decodes the ID token payload in the browser to derive display/session fields:

- `email` from `payload.email` or fallback email.
- `name` from `payload.name`, fallback username, or email local part.
- `sub` from `payload.sub`, then `payload.username`, then empty string.
- `expiresAt` from `payload.exp`, falling back to `ExpiresIn`.
- `initials` from the first two name parts.

The browser-side decode is not an authoritative signature verification step. It is used for display data and local expiry scheduling. Backend authorization verifies Cognito JWTs with PyJWT and Cognito JWKS.

Storage behavior:

- Storage key: `smile-auth-session` exists only for legacy cleanup.
- `storeAuthSession()` keeps the full `AuthSession` in module memory and removes any `smile-auth-session` value from `window.sessionStorage` and `window.localStorage`.
- No `idToken`, `accessToken`, or `refreshToken` is persisted to browser storage.
- Normal sign-in responses set a signed `__Host-smile-refresh-session` HttpOnly cookie and omit `RefreshToken` from the JSON response; `AuthSession.refreshToken` is kept only for legacy body-based refresh compatibility and is normally an empty string.
- Legacy token-bearing storage, malformed storage, and tokenless session snapshots are cleared instead of hydrated.
- `clearAuthSession()` removes current/legacy storage keys and clears the in-memory session.

Reload behavior:

- A page reload creates a new JavaScript runtime, so the in-memory Cognito bearer session is lost.
- After reload, `AuthProvider` calls `/auth/session/bootstrap`; if the signed HttpOnly refresh-session cookie is valid, the backend refreshes Cognito and returns a new in-memory bearer session.
- If bootstrap fails or no cookie is present, the app starts signed out and clears any stale legacy browser storage it finds.

This is a deliberate memory-only bearer-token posture with cookie-backed refresh. Do not change it to persistent JavaScript-readable token storage without a separate security review.

## Token Refresh Lifecycle

Refresh constants and behavior:

- Normal expiry check uses a 30 second skew in `isAuthSessionExpired()`.
- Refresh check uses `authRefreshSkewMs = 5 * 60 * 1000`.
- `AuthProvider` runs an initial `getFreshStoredAuthSession()` before setting `isReady`.
- If a session exists, `AuthProvider` schedules a timer for `session.expiresAt - Date.now() - authRefreshSkewMs`.
- Focus and `visibilitychange` trigger a freshness check when the page becomes visible/active.
- `getFreshStoredAuthSession({ force: true })` forces refresh for the current memory session.
- Concurrent refreshes dedupe through a module-level `pendingAuthSessionRefresh` promise.
- Any refresh failure clears the in-memory auth session, removes legacy storage, and returns `null`.

Refresh request:

```json
{
  "userSub": "<Cognito sub>"
}
```

Frontend sends this to `{VITE_LEARNING_BACKEND_URL}/auth/session/refresh` with `credentials: "same-origin"` so the HttpOnly refresh-session cookie is included. The refresh request intentionally does not send email; the proxy and Lambda rate-limit refresh by request source and `userSub`, because `userSub` is the Cognito identity used for the refresh `SECRET_HASH`. The backend calls Cognito `AdminInitiateAuth` with `REFRESH_TOKEN_AUTH` and backend-generated `SECRET_HASH`. For refresh-token auth on this email-as-username user pool, Cognito verifies the secret hash against the user `sub`/internal username rather than the sign-in email. Cognito may omit a new refresh token during refresh, so the backend keeps the existing refresh-session cookie unless Cognito returns a new refresh token.

## Learning Backend Authorization

Frontend protected backend clients use `accessToken` and should reach AWS through the same-origin Cloudflare Pages proxy in production:

- `fetchRemoteLearningProgress(accessToken)`
- `saveRemoteLearningProgress(accessToken, progress)`
- `inspectGuidedDownloadArchiveWithBackend(file, { getFreshSession })`
- `validateGuidedDownloadCodeWithBackend(input, { getFreshSession })`

`postLearningBackendJson()` obtains a fresh session before sending a request. If a protected POST receives `401`, it forces a session refresh once and retries with the new token if available.

Header format:

```http
Authorization: Bearer <Cognito access token>
```

Production proxy path:

```text
Browser
  -> /api/learning-backend/<backend path>
  -> Cloudflare zone rate limiting for coarse auth abuse
  -> Cloudflare Pages Function route guard and header forwarding
  -> AWS Lambda Function URL
```

The proxy forwards only `authorization`, `content-type`, the proxy-derived source IP, the private `x-smile-learning-backend-proxy-secret` header, and the whitelisted `__Host-smile-refresh-session` cookie for `/auth/session/bootstrap`, `/auth/session/refresh`, and `/auth/session/revoke`. Cookie-backed session routes also require same-origin `Origin`/`Referer` when those headers are present. The proxy enforces a backend-route and method allowlist, rejects request bodies larger than 300 KB before forwarding, strips query strings, and fails closed for non-health routes when `LEARNING_BACKEND_PROXY_SECRET` is missing. Public auth routes should receive Cloudflare zone rate limiting before Pages Functions and AWS run. The Pages proxy keeps a fallback source/IP limiter unless `LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS=false`; the Lambda keeps its DynamoDB-backed cooldowns and burst caps as the authoritative app-level control.

The proxy reads only Cloudflare's `cf-connecting-ip` header as the browser source. Browser-supplied `x-real-ip` and `x-forwarded-for` values are ignored; the `x-forwarded-for` value sent to Lambda is generated from the trusted Cloudflare source, or `unknown` when Cloudflare did not provide one. The Lambda also trusts only `cf-connecting-ip`, and only when `LEARNING_BACKEND_PROXY_SECRET` is configured and the proxy secret header matches. If that trusted source is unavailable, Lambda falls back to the Function URL `requestContext.http.sourceIp`. In production, `LEARNING_BACKEND_REQUIRE_PROXY_SECRET=true` makes every non-health HTTP route return `403` unless that shared secret is present, so direct Lambda Function URL callers cannot bypass Cloudflare rate limits or spoof the auth cooldown source.

The backend verifier accepts both Cognito ID tokens and access tokens:

- JWT is verified with PyJWT and the Cognito JWKS URL for the configured issuer.
- `iss` must match `https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}`.
- For ID tokens, `aud` must equal `COGNITO_CLIENT_ID`.
- For access tokens, `client_id` must equal `COGNITO_CLIENT_ID`.
- `token_use` must be `id` or `access`.
- `sub` must be present and non-empty.

The backend returns the authenticated user as:

```py
{
    "email": claims.get("email", ""),
    "sub": subject,
}
```

## Protected Backend Data Ownership

The Cognito `sub` claim is the backend ownership boundary.

Learning progress:

- `GET /progress` reads DynamoDB item `userId = sub`.
- `PUT /progress` writes DynamoDB item `userId = sub`.
- Payloads must pass `is_valid_learning_progress()` and be under `MAX_PROGRESS_JSON_BYTES`.

Guided-download uploads:

- `POST /uploads/presign` creates S3 keys under `uploads/{sub}/{uuid}/{safe_file_name}`.
- `POST /datasets/inspect` and `POST /pandas/validate` call `require_upload_object_key()`.
- `require_upload_object_key()` rejects any object key not starting with `uploads/{sub}/`.
- S3 upload URLs expire after 600 seconds.
- Uploaded objects under `uploads/` expire after 1 day by S3 lifecycle.

Frontend local learning progress:

- Guest progress lives under `smile-learning-progress-v1`.
- Account progress cache lives under `smile-learning-progress-account-v1:{encodedUserId}`.
- `userId` is `session.user.sub || session.user.email`.
- On sign-in, guest progress, local account cache, and remote progress are merged.
- If merged progress saves remotely, unchanged guest progress is cleared.
- On logout, local account cache for the previous user is cleared and account progress is hidden from guest state.

## Backend API Contract

Public auth endpoints:

| Method | Path                           | Auth | Purpose                                                                         |
| ------ | ------------------------------ | ---- | ------------------------------------------------------------------------------- |
| `POST` | `/auth/sign-up/start`          | None | Start backend-owned pending sign-up and send verification code.                 |
| `POST` | `/auth/confirmation/confirm`   | None | Verify pending sign-up code, create Cognito user, set password.                 |
| `POST` | `/auth/confirmation/resend`    | None | Send a new pending sign-up code if cooldown allows.                             |
| `POST` | `/auth/email/sign-in`          | None | Sign in with email through backend-enforced public auth cooldowns.              |
| `POST` | `/auth/username/sign-in`       | None | Sign in with display username without returning the resolved account email.     |
| `POST` | `/auth/session/bootstrap`      | None | Restore an in-memory Cognito bearer session from the signed HttpOnly cookie.    |
| `POST` | `/auth/session/refresh`        | None | Refresh an in-memory Cognito bearer session through backend-owned Cognito auth. |
| `POST` | `/auth/session/revoke`         | None | Best-effort Cognito refresh-token revocation and refresh cookie clearing.       |
| `POST` | `/auth/password-reset/request` | None | Start Cognito password reset through backend-enforced public auth cooldowns.    |
| `POST` | `/auth/password-reset/confirm` | None | Confirm Cognito password reset through backend-enforced public auth cooldowns.  |

Public auth endpoints apply DynamoDB-backed cooldowns by request source and identifier. Sign-in routes also apply a longer DynamoDB-backed burst window by source and identifier. This is an app-level guard and must stay enabled even when Cloudflare rate limiting is active, because Cloudflare cannot reliably count by application email, username, user sub, or wrong verification-code attempts. The deprecated `/auth/username/resolve` compatibility route is intentionally excluded from the production Pages proxy allowlist.

Protected endpoints:

| Method | Path                | Auth                 | Purpose                                                           |
| ------ | ------------------- | -------------------- | ----------------------------------------------------------------- |
| `GET`  | `/progress`         | Bearer Cognito token | Read remote learning progress for `sub`.                          |
| `PUT`  | `/progress`         | Bearer Cognito token | Save remote learning progress for `sub`.                          |
| `POST` | `/uploads/presign`  | Bearer Cognito token | Create temporary S3 PUT URL under `uploads/{sub}/`.               |
| `POST` | `/datasets/inspect` | Bearer Cognito token | Inspect the user's uploaded ZIP and find CSV metadata.            |
| `POST` | `/pandas/validate`  | Bearer Cognito token | Run restricted Pandas validation against the user's uploaded CSV. |

Unauthenticated utility endpoint:

| Method | Path      | Auth | Purpose             |
| ------ | --------- | ---- | ------------------- |
| `GET`  | `/health` | None | Basic health check. |

Common error mapping:

| Exception                                    | Status | Response                                                                                                                    |
| -------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| `AuthenticationError`                        | `401`  | `{ "message": "..." }`                                                                                                      |
| `AuthConfigurationError`                     | `500`  | `{ "message": "Auth is not configured for this backend." }`                                                                 |
| `AuthCooldownError`                          | `429`  | `{ "code": "ResendConfirmationCooldownException", "message": "...", "nextAllowedAt": number, "retryAfterSeconds": number }` |
| `AuthRateLimitError`                         | `429`  | `{ "code": "AuthRateLimitExceededException", "message": "...", "nextAllowedAt": number, "retryAfterSeconds": number }`      |
| `AuthCodeExpiredError`                       | `400`  | `{ "code": "ExpiredCodeException", "message": "..." }`                                                                      |
| `UsernameReservationError`                   | `400`  | `{ "code": "InvalidUsernameException", "message": "..." }`                                                                  |
| `CognitoSignInError`                         | `400`  | `{ "code": error.code, "message": "..." }`                                                                                  |
| `ClientInputError`                           | `400`  | `{ "message": "..." }`                                                                                                      |
| AWS `ClientError` outside handled auth cases | `502`  | `{ "message": "Backend AWS operation failed." }`                                                                            |
| `zipfile.BadZipFile`                         | `400`  | `{ "message": "The uploaded file is not a readable ZIP archive." }`                                                         |

Handled Cognito throttling errors such as `LimitExceededException` and `TooManyRequestsException` are normalized to `AuthRateLimitError`, so public auth throttling returns `429` instead of falling through as a generic backend failure.

Frontend auth error mapping lives in `getAuthErrorMessage()` in `AuthPage`. Known mapped codes include:

- `AuthNotConfigured`
- `AuthRateLimitExceededException`
- `CodeMismatchException`
- `ExpiredCodeException`
- `InvalidPasswordException`
- `InvalidUsernameException`
- `LimitExceededException`
- `NotAuthorizedException`
- `PasswordResetRequiredException`
- `TooManyFailedAttemptsException`
- `UsernameExistsException`
- `UserNotFoundException`
- `UserLambdaValidationException` containing "username is already taken"

## AWS Infrastructure

`backend/aws/learning-backend/template.yaml` defines the auth infrastructure.

### Cognito User Pool

Current settings:

- `UsernameAttributes: [email]`
- `AutoVerifiedAttributes: [email]`
- Account recovery through verified email.
- Public self-sign-up disabled with `AllowAdminCreateUserOnly: true`.
- Deletion protection enabled with `DeletionProtection: ACTIVE`.
- Password policy: minimum 12, uppercase, lowercase, number, and symbol.
- Attributes: required `email`, mutable optional `name`.
- Lambda triggers:
  - `PreSignUp`: `AuthUsernameFunction`
  - `PostConfirmation`: `AuthUsernameFunction`
  - `CustomEmailSender`: `AuthEmailSenderFunction`
- Verification messages use code flow.

Because the main registration path is backend-owned and creates users with admin APIs, Cognito `PreSignUp` and `PostConfirmation` are mostly protective for Cognito-native flows. Username reservation for the app's normal sign-up happens directly in backend application code.

### Cognito App Client

Current settings:

- `GenerateSecret: true`
- Explicit auth flows:
  - `ALLOW_ADMIN_USER_PASSWORD_AUTH`
  - `ALLOW_REFRESH_TOKEN_AUTH`
- `PreventUserExistenceErrors: ENABLED`
- `EnableTokenRevocation: true`
- Access token validity: 1 hour.
- ID token validity: 1 hour.
- Refresh token validity: 7 days.

The current frontend does not call Cognito directly. Password sign-in and refresh go through backend-owned Cognito calls with `SECRET_HASH`. Direct public `USER_PASSWORD_AUTH`, `USER_SRP_AUTH`, forgot-password, and confirm-forgot-password calls with only the client ID should fail because the app client has a secret that is only available to the backend.

### DynamoDB Tables

`LearningProgressTable`

- Partition key: `userId`.
- Stores compact JSON progress per Cognito `sub`.
- Point-in-time recovery enabled.

`UsernameReservationTable`

- Partition key: `usernameKey`.
- Stores `email`, `username`, `usernameKey`, `status`.
- Pending reservations include `expiresAt` and expire through TTL.
- Confirmed reservations remove `expiresAt`, so they do not expire.
- Point-in-time recovery enabled.

`AuthCooldownTable`

- Partition key: `cooldownKey`.
- Stores backend-owned pending sign-up items and cooldown/expiry helper items.
- TTL attribute: `expiresAt`.
- Pending sign-up keys are `pending-signup#{sha256(email)}`.
- Generic cooldown helper keys use `{scope}#{sha256(value)}`.

### Lambda Functions

`LearningBackendFunction`

- Public Lambda Function URL with `AuthType: NONE`.
- Production non-health routes require the Cloudflare Pages proxy secret before app route logic runs.
- App-level auth happens inside `require_authenticated_user()`.
- Owns auth HTTP endpoints, protected progress endpoints, and guided-download backend endpoints.
- Has S3, DynamoDB, Cognito admin, and Resend API key secret-read permissions.

`AuthUsernameFunction`

- Used as Cognito `PreSignUp` and `PostConfirmation` trigger.
- Has access to `UsernameReservationTable`.

`AuthEmailSenderFunction`

- Used as Cognito `CustomEmailSender`.
- Decrypts Cognito codes through KMS.
- Sends emails through Resend.
- Has access to `AuthCooldownTable`, KMS decrypt, and the Resend API key secret.

### Email Delivery

Backend-owned sign-up emails are sent directly by `LearningBackendFunction` through Resend. They do not wait for Cognito to generate a sign-up email because Cognito user creation happens only after the backend verifies the code.

Other Cognito-generated auth emails, such as forgot password or user attribute verification, go through the Cognito custom email sender trigger:

```text
Cognito custom email event
  -> AuthEmailSenderFunction
  -> decrypt Cognito code with KMS
  -> build Indonesian email copy
  -> send through Resend
```

The custom sender records confirmation-code expiry for `CustomEmailSender_SignUp` and `CustomEmailSender_ResendCode`, but the current backend-owned HTTP sign-up path enforces expiry through the pending sign-up item instead.

### Resend Integration

Resend is the email delivery provider, not the owner of auth state. All verification-code state, cooldowns, attempts, and expiry rules live in DynamoDB and backend code.

Where Resend is called:

- Backend-owned sign-up start and resend call `send_pending_signup_confirmation_email()`, which builds the same email shape as Cognito sign-up email copy and then calls `send_resend_email()`.
- Cognito custom email events call `send_cognito_email_with_resend()`, decrypt the Cognito code first, build a trigger-specific email message, then call `send_resend_email()`.

`send_resend_email()` sends a `POST` request to `RESEND_API_URL`, defaulting to `https://api.resend.com/emails`, with:

- `from`: `RESEND_FROM_EMAIL`.
- `to`: single recipient email in an array.
- `subject`: generated auth email subject.
- `text`: plain text email body.
- `html`: HTML email body.
- `reply_to`: included only when `RESEND_REPLY_TO_EMAIL` is configured.
- `Authorization: Bearer <Resend API key>`.
- `User-Agent: SmileLab/1.0 (+https://smile-project.pages.dev)`.
- Timeout: `RESEND_REQUEST_TIMEOUT_SECONDS = 10`.

Resend API key resolution:

1. If `RESEND_API_KEY` exists, backend uses it directly.
2. Otherwise, backend reads `RESEND_API_KEY_SECRET_ID` from AWS Secrets Manager.
3. Secret values may be plain text, embedded text containing an `re_...` token, or JSON with one of `apiKey`, `resendApiKey`, `RESEND_API_KEY`, or `api_key`.
4. The resolved key is cached in module memory as `_resend_api_key_cache`.

SAM deploy path:

- `ResendApiKeySecretName` defaults to `smile/resend/api-key`.
- `ResendFromEmail` defaults to `Smile Lab <auth@smilelab.me>`.
- `ResendReplyToEmail` defaults to an empty string.
- `LearningBackendFunction` receives the Resend env values and Secrets Manager read permission because backend-owned sign-up start/resend sends email directly.
- `AuthEmailSenderFunction` gets Secrets Manager read permission for the configured secret and KMS decrypt permission for Cognito custom email codes.
- `AuthEmailSenderFunction` receives the same Resend env values because Cognito custom email triggers also send through Resend.

Failure behavior:

- Resend HTTP errors raise `RuntimeError` with the Resend status and up to 500 characters of response detail.
- Resend URL errors raise `RuntimeError("Resend email request failed.")`.
- These runtime errors are not mapped to a custom auth response in `lambda_handler`, so a failed email send can surface as an unhandled Lambda failure for the auth request.
- Cooldown and pending sign-up records may already have been written before the email send fails. If this behavior changes, update the pending-sign-up flow and tests together.

## CORS, CSP, and Deploy Surface

Cloudflare Pages:

- `wrangler.jsonc` builds from `dist`.
- `public/_redirects` rewrites all routes to `/index.html`, so modal routes and deep learning routes work on refresh.
- `public/_headers` sets CSP, HSTS, frame protection, and other security headers.
- `functions/api/learning-backend/[[path]].ts` proxies backend calls through Cloudflare Pages before AWS with exact route/method allowlists, trusted Lambda Function URL validation, a 300 KB request-body limit, secret-header injection, refresh-session cookie forwarding only for cookie-backed session routes, no query-string forwarding, and `Authorization` forwarding only for protected backend routes. Unknown `/auth/...` paths are rejected at the edge instead of being forwarded to AWS. The proxy source/IP auth limiter stays enabled with the Cloudflare Free-plan-compatible single auth rule and should be disabled with `LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS=false` only if Cloudflare has equivalent granular route-specific auth rate limits.
- Current CSP `connect-src` allows `'self'`, `https://s3.ap-southeast-1.amazonaws.com`, and `https://*.s3.ap-southeast-1.amazonaws.com`. This supports the same-origin proxy and S3 presigned uploads without allowing browser calls to direct Cognito or Lambda Function URL origins.

AWS:

- Lambda Function URL CORS `AllowOrigins` comes from SAM parameter `FunctionUrlAllowedOrigins`, which should stay limited to local/dev origins because production browser traffic uses the Pages proxy.
- Lambda Function URL allows `GET`, `POST`, `PUT`.
- Lambda Function URL allows headers `authorization` and `content-type`.
- Production `LearningBackendFunction` sets `LEARNING_BACKEND_REQUIRE_PROXY_SECRET=true`, so direct Function URL app requests can only use `/health`; non-health app routes must arrive through the Pages proxy with the shared secret.
- Lambda JSON responses set `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
- S3 upload CORS uses SAM parameter `AllowedOrigins`, allows `PUT`, exposes `ETag`, and accepts all headers.

Deployment must keep these aligned:

1. Cloudflare Pages origin must be included in SAM `AllowedOrigins` for S3 upload CORS.
2. Production `VITE_LEARNING_BACKEND_URL` must be `/api/learning-backend` so browser backend traffic uses the Cloudflare proxy.
3. Cloudflare Pages Function `LEARNING_BACKEND_URL` must point at the SAM `LearningBackendFunctionUrl`; the proxy rejects non-HTTPS, credentialed, path-scoped, or non-`*.lambda-url.<region>.on.aws` backend URLs before forwarding bearer tokens or proxy secrets.
4. SAM `LearningBackendProxySecret` must match Cloudflare Pages Function `LEARNING_BACKEND_PROXY_SECRET`.
5. The Cloudflare auth rate limiting rule from `docs/cloudflare-auth-rate-limiting.md` must be active on the production custom domain, and the Pages proxy fallback limiter must stay enabled unless Cloudflare has equivalent granular route-specific auth rate limits.
6. Backend `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, and `COGNITO_CLIENT_SECRET` must come from the same SAM stack.
7. `FunctionUrlAllowedOrigins` should remain local/dev only unless a separate review approves direct browser access to the Function URL.
8. CSP must continue allowing the same-origin proxy plus S3 upload origins; do not add direct Cognito or Lambda Function URL origins without a separate review.

Current `backend/aws/learning-backend/samconfig.toml` deploy defaults use stack `smile-learning-backend`, region `ap-southeast-1`, profile `smile-dev`, `LearningBackendRequireProxySecret=true`, `AllowedOrigins` for local dev plus `https://smile-project.pages.dev`, and `FunctionUrlAllowedOrigins` for local dev only. It intentionally does not store `LearningBackendProxySecret`, `ResendFromEmail`, or `ResendReplyToEmail`; production deploys must pass the current shared secret or preserve the existing CloudFormation `NoEcho` value, and sender overrides must be verified after deploy if they are customized.

## Environment Mapping After Backend Deploy

SAM outputs map to frontend env like this:

| SAM output or value          | Deployment env                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/api/learning-backend`      | Frontend `VITE_LEARNING_BACKEND_URL`                                                                         |
| `LearningBackendFunctionUrl` | Required Cloudflare Pages Function `LEARNING_BACKEND_URL` env                                                |
| `LearningBackendProxySecret` | SAM parameter `LearningBackendProxySecret` and Cloudflare Pages Function `LEARNING_BACKEND_PROXY_SECRET` env |
| `CognitoRegion`              | Backend `COGNITO_REGION`                                                                                     |
| `CognitoUserPoolId`          | Backend `COGNITO_USER_POOL_ID`                                                                               |
| `CognitoUserPoolClientId`    | Backend `COGNITO_CLIENT_ID`                                                                                  |
| `SmileUserPoolClient` secret | Backend `COGNITO_CLIENT_SECRET`; never expose this to the frontend                                           |

Backend auth-related environment is set by SAM:

| Backend env                                   | Source or default                                       |
| --------------------------------------------- | ------------------------------------------------------- |
| `UPLOAD_BUCKET`                               | `DatasetUploadBucket`                                   |
| `LEARNING_PROGRESS_TABLE`                     | `LearningProgressTable`                                 |
| `USERNAME_RESERVATION_TABLE`                  | `UsernameReservationTable`                              |
| `AUTH_COOLDOWN_TABLE`                         | `AuthCooldownTable`                                     |
| `AUTH_RESEND_COOLDOWN_SECONDS`                | `30`                                                    |
| `AUTH_CONFIRMATION_CODE_TTL_SECONDS`          | `300`                                                   |
| `AUTH_PUBLIC_REQUEST_COOLDOWN_SECONDS`        | `3`                                                     |
| `AUTH_SIGN_IN_COOLDOWN_SECONDS`               | `2`                                                     |
| `AUTH_SIGN_IN_BURST_LIMIT`                    | `8`                                                     |
| `AUTH_SIGN_IN_BURST_WINDOW_SECONDS`           | `300`                                                   |
| `AUTH_SIGN_UP_COOLDOWN_SECONDS`               | `5`                                                     |
| `AUTH_REFRESH_SESSION_COOKIE_MAX_AGE_SECONDS` | `604800`                                                |
| `AUTH_REFRESH_SESSION_COOKIE_SECURE`          | `true`                                                  |
| `COGNITO_USER_POOL_ID`                        | `SmileUserPool`                                         |
| `COGNITO_CLIENT_ID`                           | `SmileUserPoolClient`                                   |
| `COGNITO_CLIENT_SECRET`                       | `SmileUserPoolClient.ClientSecret`                      |
| `COGNITO_REGION`                              | AWS region                                              |
| `COGNITO_EMAIL_SENDER_KMS_KEY_ARN`            | `CognitoEmailSenderKmsKey` for custom sender            |
| `RESEND_API_KEY_SECRET_ID`                    | `ResendApiKeySecretName` parameter                      |
| `RESEND_FROM_EMAIL`                           | `ResendFromEmail` parameter                             |
| `RESEND_REPLY_TO_EMAIL`                       | `ResendReplyToEmail` parameter                          |
| `LEARNING_BACKEND_PROXY_SECRET`               | `LearningBackendProxySecret` parameter                  |
| `LEARNING_BACKEND_REQUIRE_PROXY_SECRET`       | `LearningBackendRequireProxySecret`, defaults to `true` |

Local backend code also supports direct `RESEND_API_KEY`, `RESEND_API_URL`, and AWS SDK region env values, but the SAM path uses Secrets Manager for the Resend key.

## Validation and Test Coverage

Frontend auth-related tests:

- `src/features/auth/auth-session.test.ts`
  - Keeps the active auth session in module memory only.
  - Does not persist ID, access, or refresh tokens in browser storage.
  - Clears legacy `localStorage` and `sessionStorage` auth sessions instead of hydrating bearer tokens.
  - Clears current and legacy storage.
- `src/features/auth/auth-context.test.tsx`
  - Refreshes an open session before token expiry.
  - Bootstraps a session after reload from the backend refresh cookie.
  - Keeps refreshed tokens out of browser storage.
- `src/features/auth/cognito-auth.test.ts`
  - Starts sign-up through learning backend.
  - Confirms sign-up through learning backend with password.
  - Signs in with username through the backend without receiving the resolved account email.
  - Requests and confirms Cognito password reset.
  - Refreshes sessions through the backend instead of calling Cognito directly.
  - Bootstraps sessions through the backend refresh cookie.
- `src/features/learning/api/learning-backend.test.ts`
  - Does not call backend upload endpoints without signed-in session.
  - Sends `Authorization: Bearer <accessToken>` for guided backend calls.
  - Refreshes stale token before guided backend requests.
- `src/features/learning/server/learning-backend-proxy.test.ts`
  - Forwards allowed backend requests with auth and original source headers.
  - Applies edge cooldown before repeated public auth requests reach AWS.
  - Applies edge sign-in burst caps.
  - Forwards only the whitelisted refresh-session cookie for cookie-backed auth routes.
  - Rate-limits refresh requests by `userSub` without requiring email.
- `src/features/learning/progress/learning-progress.test.tsx`
  - Merges guest progress into signed-in account.
  - Clears guest bucket after remote save.
  - Hides and clears account progress after logout.
- `src/app/App.test.tsx`
  - Covers guest auth modal before opening auth-required guided-download lesson.
  - Covers signed-in access to that lesson.

Backend auth-related tests in `backend/aws/learning-backend/tests/test_app.py` cover:

- Rejecting guest session/body for dataset tools.
- Cognito JWT verifier accepting configured ID tokens and rejecting wrong audiences.
- Username reservation pending and confirmed states.
- Duplicate username rejection.
- Deprecated username resolution not returning email.
- Username sign-in from confirmed reservations only, with Cognito tokens returned and no email field.
- Unknown username sign-in follows the same backend-owned Cognito auth path with a deterministic dummy Cognito username before returning generic failure.
- Public auth rate limit cooldowns for source and identifier.
- Sign-in burst caps for source and identifier.
- Resend cooldown helper behavior.
- Backend-owned sign-up storage, code hashing, email sending, existing-email generic response, and cooldown.
- Reusing active pending username after cooldown.
- Resend confirmation behavior.
- Confirmation code expiry.
- Wrong-code attempt counting.
- Confirm sign-up creating Cognito user, setting password, confirming reservation, and deleting pending sign-up.
- Custom email sender decryption and Resend delivery.
- Resend API key extraction from plain text or JSON secret.

Useful validation commands:

```sh
vp test run
```

```sh
vp check src
```

```sh
python3 -m unittest discover -s backend/aws/learning-backend/tests
```

```sh
sam validate --template-file backend/aws/learning-backend/template.yaml --region ap-southeast-1 --profile smile-dev
```

Use direct `vp` commands for frontend checks. The Python/SAM commands apply to the AWS backend.

## Maintenance Notes and Gotchas

- `getAuthAuthorizationHeader()` in `auth-session.ts` returns a bearer access token but is currently unused. Current learning backend clients call `getFreshStoredAuthSession()` instead.
- `reserve_confirmation_resend()` and `assert_confirmation_code_is_active()` in backend code are tested helpers but are not the main HTTP pending-sign-up flow. The HTTP flow uses the pending sign-up item's `nextAllowedAt`, `expiresAt`, and `attempts`.
- Frontend sends `accessToken` to the learning backend. Backend still accepts both ID and access tokens, but downstream code should not assume access tokens include ID-token-only display claims.
- `AuthProvider` may hold an expired session during startup until refresh/check completes. Use `isReady` when route behavior depends on knowing auth state.
- A session can be restored after reload only through the signed HttpOnly refresh-session cookie; Cognito bearer tokens remain memory-only.
- Refresh tokens expire after 7 days. The browser JavaScript runtime does not receive the refresh token in normal sign-in or refresh responses.
- Username sign-in sends username and password to `/auth/username/sign-in` by design so the backend can hide the resolved account email. Do not reintroduce client-side email resolution, proxy `/auth/username/resolve` in production, or return email from that deprecated backend route.
- Registration confirmation sends password to the backend by design. If that changes, the whole backend-owned Cognito user creation model must be redesigned.
- Do not enable public `USER_PASSWORD_AUTH` or `USER_SRP_AUTH` on the app client. Doing so would let clients bypass backend public-auth cooldowns.
- Cognito user pool self-sign-up is disabled. Enabling it would bypass the backend-owned pending sign-up policy unless Cognito triggers are hardened and the frontend flow is rewritten.
- `name` in Cognito is the display username, not a full name.
- Confirmed username reservations never expire because `expiresAt` is removed.
- Pending sign-up responses avoid user enumeration in start/resend by returning confirmation-shaped `ok` responses even when no email is sent.
- Public auth endpoint cooldowns are DynamoDB-backed application controls. Keep Cloudflare zone rate limiting enabled for the deployed origin as an additional production control.
- Protected backend authorization is app-level inside Lambda because Function URL `AuthType` is `NONE`.
- Forwarded IP headers are trusted only when the Pages proxy shared secret matches.
- CSP and SAM CORS must be updated together when origins change.

## Production Hardening Checklist

Current required controls before deploy:

- Frontend env must define `VITE_LEARNING_BACKEND_URL`; the app no longer falls back to a committed backend URL.
- Production `VITE_LEARNING_BACKEND_URL` must use `/api/learning-backend` so Cloudflare zone rate limiting and the Pages proxy run before AWS.
- Cloudflare Pages Function env must define `LEARNING_BACKEND_URL`; the proxy fails closed without it.
- Cloudflare Pages Function `LEARNING_BACKEND_URL` must be the trusted HTTPS Lambda Function URL from the SAM stack output, not an arbitrary custom origin.
- Cloudflare Pages Function env must define `LEARNING_BACKEND_PROXY_SECRET`; the proxy fails closed for non-health routes without it.
- Cloudflare Pages Function env may set `LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS=false` only if Cloudflare has equivalent granular route-specific auth rate limits; keep it unset with the Free-plan-compatible single auth rule.
- Cloudflare Pages proxy must forward bearer tokens only to protected routes (`/progress`, `/uploads/presign`, `/datasets/inspect`, `/pandas/validate`) and must not forward browser query strings to the Lambda backend.
- `LearningBackendProxySecret` in SAM must match Cloudflare Pages Function env `LEARNING_BACKEND_PROXY_SECRET`.
- `LearningBackendRequireProxySecret` must remain `true` in production so direct Function URL app routes return `403`.
- Username login must use `/auth/username/sign-in`; `/auth/username/resolve` must not be proxied in production and must not return account emails.
- Email login and password reset must use backend `/auth/...` endpoints so public auth cooldowns apply.
- Public auth routes must keep DynamoDB cooldowns enabled through `AUTH_COOLDOWN_TABLE`.
- Existing-email sign-up must stay confirmation-shaped and generic.
- Password policy must stay aligned across Cognito, backend validation, and frontend copy: minimum 12, uppercase, lowercase, number, and symbol.
- Password reset must use Cognito ForgotPassword/ConfirmForgotPassword with generic copy.
- Cognito app client must keep `GenerateSecret=true`, `ALLOW_ADMIN_USER_PASSWORD_AUTH`, and `ALLOW_REFRESH_TOKEN_AUTH`; do not re-enable public password or SRP auth flows.
- Cognito app client must keep token revocation enabled and refresh-token validity short enough for the memory-only browser-session posture.
- Protected learning routes must require backend-verified Cognito bearer tokens.
- Backend JSON responses must include `Cache-Control: no-store`.
- Cloudflare CSP and S3 CORS origins must remain aligned with the deployed frontend origin; Lambda Function URL CORS should remain local/dev only, and CSP should not allow direct Cognito or Lambda Function URL calls in production.
- Cloudflare auth rate limiting must remain enabled for public auth routes in addition to DynamoDB cooldowns. Keep the Pages proxy fallback limiter enabled with the Free-plan-compatible single rule and in any environment not protected by Cloudflare zone rate limiting.
