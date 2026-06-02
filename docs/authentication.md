# Authentication Developer Documentation

Last audited: 2026-06-02

This document describes the current authentication system in Smile Project from the code that exists today. The app does not use Cognito Hosted UI, Amplify, cookies, or a server session. The browser owns the UI session, Amazon Cognito issues tokens, and the AWS learning backend owns custom sign-up policy, username reservation, verification email delivery, learning-progress sync, and protected guided-download backend work.

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
| Learning progress account sync                       | `src/features/learning/progress/learning-progress.ts`, `src/features/learning/progress/learning-progress-sync.ts` |
| Backend Lambda, Cognito triggers, token verification | `backend/aws/learning-backend/src/app.py`                                                                         |
| AWS auth infrastructure                              | `backend/aws/learning-backend/template.yaml`, `backend/aws/learning-backend/samconfig.toml`                       |
| Backend auth README                                  | `backend/aws/learning-backend/README.md`                                                                          |
| Cloudflare Pages deploy config                       | `wrangler.jsonc`, `public/_headers`, `public/_redirects`                                                          |

## System Model

The system has four auth-related layers:

1. The React app renders `/login` and `/register` as a shared modal over the current app route.
2. The React auth context stores the Cognito session in browser memory/session storage and exposes `signIn`, `signUp`, `confirmSignUp`, `resendConfirmationCode`, `getFreshSession`, and `signOut`.
3. Cognito issues ID, access, and refresh tokens through the public app client.
4. The learning backend is a public Lambda Function URL with app-level auth. It verifies Cognito bearer tokens for protected routes and runs custom backend-owned sign-up endpoints for registration.

Important non-goals in the current implementation:

- No Cognito Hosted UI.
- No Amplify auth client.
- No cookie session.
- No refresh token persisted to browser storage.
- No password reset UI in the frontend, although the backend custom email sender has copy for Cognito forgot-password emails if that Cognito flow is introduced later.
- No MFA flow in the frontend.

## Frontend Configuration

The frontend reads these Vite env values:

| Env                         | Used by                             | Meaning                                                                                                                                           |
| --------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_LEARNING_BACKEND_URL` | `src/lib/learning-backend-url.ts`   | Base URL for the Lambda Function URL. If absent, the code falls back to the committed ap-southeast-1 Function URL. Trailing slashes are stripped. |
| `VITE_COGNITO_REGION`       | `src/features/auth/cognito-auth.ts` | Cognito region used to call `https://cognito-idp.{region}.amazonaws.com/`.                                                                        |
| `VITE_COGNITO_USER_POOL_ID` | `src/features/auth/cognito-auth.ts` | User pool ID. Frontend uses it only to decide whether auth is configured.                                                                         |
| `VITE_COGNITO_CLIENT_ID`    | `src/features/auth/cognito-auth.ts` | Public app client ID passed to Cognito `InitiateAuth`.                                                                                            |

`getCognitoConfig()` trims the three Cognito env values and sets `isConfigured` only when all are present. `requireCognitoConfig()` throws `CognitoAuthError` with code `AuthNotConfigured` when any value is missing.

`.env.local` currently contains these four frontend keys and is ignored by git through `.gitignore`.

## Auth Context API

`AuthProvider` wraps the whole app in `src/app/App.tsx`, inside `LocalizationProvider` and outside app routes. It exposes:

| Field                           | Meaning                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `session`                       | Current `AuthSession` or `null`. May include an expired session during startup while refresh is attempted.      |
| `isReady`                       | `true` after initial stored-session refresh/check finishes. Learning routes use this before showing auth gates. |
| `isAuthenticated`               | `true` only when a session exists and is not expired under the default 30 second expiry skew.                   |
| `signIn(input)`                 | Signs in with email or username and stores the session.                                                         |
| `signUp(input)`                 | Clears any current session, starts backend-owned sign-up, and returns masked delivery details.                  |
| `confirmSignUp(input)`          | Confirms backend-owned sign-up. It does not store a session by itself. The UI signs in after confirmation.      |
| `resendConfirmationCode(email)` | Resends the backend-owned verification code and returns cooldown details.                                       |
| `getFreshSession(options)`      | Returns a usable stored session, refreshing it if needed or forced.                                             |
| `signOut()`                     | Clears current and legacy auth storage and sets `session` to `null`.                                            |

`AuthProvider` listens for the custom `smile-auth-session-changed` browser event so state updates when helper functions write or clear auth storage.

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
  -> Cognito InitiateAuth USER_PASSWORD_AUTH
  -> createAuthSession()
  -> storeAuthSession()
```

Request details:

- Cognito endpoint: `https://cognito-idp.{VITE_COGNITO_REGION}.amazonaws.com/`
- Header `x-amz-target`: `AWSCognitoIdentityProviderService.InitiateAuth`
- `AuthFlow`: `USER_PASSWORD_AUTH`
- `AuthParameters.USERNAME`: normalized lowercase email
- `AuthParameters.PASSWORD`: password
- `ClientId`: `VITE_COGNITO_CLIENT_ID`

The password is sent directly from the browser to Cognito for normal email sign-in.

### Username Sign-In

Flow:

```text
AuthPage
  -> auth.signIn({ method: "username", identifier: username, password })
  -> signInWithUsername()
  -> POST /auth/username/resolve with { username }
  -> backend returns confirmed email
  -> Cognito InitiateAuth USER_PASSWORD_AUTH with email + password
  -> createAuthSession()
  -> storeAuthSession()
```

The password is not sent to the backend for username sign-in. The backend only receives the username and returns an email if the username reservation status is `confirmed`. Pending username reservations are ignored and return `NotAuthorizedException`.

The UI defaults to username login. Users can toggle to email login with the field label action.

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

- Minimum 8 characters.
- Must include lowercase and uppercase letters.
- Must include a number.
- Symbols are not required.

The frontend shows live password requirements. The backend validates the password again before creating the Cognito user. Cognito also enforces the same policy.

### Start Sign-Up

Flow:

```text
AuthPage register step
  -> auth.signUp({ email, name })
  -> POST /auth/sign-up/start
  -> backend normalizes email
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
- Max failed confirmation attempts: 5.
- Pending username reservation TTL: 24 hours.
- Auth cooldown table TTL for generic cooldown helpers: 1 hour.
- The raw code is not stored. `codeHash = sha256("{salt}:{email}:{code}")`.

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
  -> frontend signs in by email through Cognito
```

Request:

```json
{
  "email": "student@example.com",
  "code": "123456",
  "password": "Password1"
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

- Storage key: `smile-auth-session`.
- The persisted current session lives in `window.sessionStorage`.
- `localStorage` is only used for legacy migration and cleanup.
- The stored JSON omits `refreshToken`.
- `refreshToken` is kept in module memory (`inMemoryRefreshToken`) after sign-in, refresh, or legacy migration.
- `clearAuthSession()` removes both session and legacy local storage keys and clears in-memory refresh token.

Reload behavior:

- `sessionStorage` survives page reload in the same tab, so the ID/access token and user info can survive reload.
- The in-memory refresh token does not survive page reload.
- After a reload, an otherwise valid session can remain authenticated until it reaches the refresh window, but it cannot refresh unless the refresh token is still in module memory or was just migrated from legacy local storage.
- Because `authRefreshSkewMs` is 5 minutes, a reloaded tab without a refresh token will be cleared when `getFreshStoredAuthSession()` decides the token is within 5 minutes of expiry.

This is a deliberate short-lived browser-session posture. Do not change it to persistent refresh-token storage without a separate security review.

## Token Refresh Lifecycle

Refresh constants and behavior:

- Normal expiry check uses a 30 second skew in `isAuthSessionExpired()`.
- Refresh check uses `authRefreshSkewMs = 5 * 60 * 1000`.
- `AuthProvider` runs an initial `getFreshStoredAuthSession()` before setting `isReady`.
- If a session has a refresh token, `AuthProvider` schedules a timer for `session.expiresAt - Date.now() - authRefreshSkewMs`.
- Focus and `visibilitychange` trigger a freshness check when the page becomes visible/active.
- `getFreshStoredAuthSession({ force: true })` forces refresh if a refresh token exists.
- Concurrent refreshes dedupe through a module-level `pendingAuthSessionRefresh` promise.
- Any refresh failure clears auth storage and returns `null`.

Refresh request:

```json
{
  "AuthFlow": "REFRESH_TOKEN_AUTH",
  "AuthParameters": {
    "REFRESH_TOKEN": "<refresh token>"
  },
  "ClientId": "<VITE_COGNITO_CLIENT_ID>"
}
```

Cognito may omit a new refresh token during refresh. `createAuthSession()` preserves the previous refresh token through `previousRefreshToken`.

## Learning Backend Authorization

Frontend protected backend clients use `idToken`:

- `fetchRemoteLearningProgress(idToken)`
- `saveRemoteLearningProgress(idToken, progress)`
- `inspectGuidedDownloadArchiveWithBackend(file, { getFreshSession })`
- `validateGuidedDownloadCodeWithBackend(input, { getFreshSession })`

`postLearningBackendJson()` obtains a fresh session before sending a request. If a protected POST receives `401`, it forces a session refresh once and retries with the new token if available.

Header format:

```http
Authorization: Bearer <Cognito ID token>
```

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

| Method | Path                         | Auth | Purpose                                                                      |
| ------ | ---------------------------- | ---- | ---------------------------------------------------------------------------- |
| `POST` | `/auth/sign-up/start`        | None | Start backend-owned pending sign-up and send verification code.              |
| `POST` | `/auth/confirmation/confirm` | None | Verify pending sign-up code, create Cognito user, set password.              |
| `POST` | `/auth/confirmation/resend`  | None | Send a new pending sign-up code if cooldown allows.                          |
| `POST` | `/auth/username/resolve`     | None | Resolve confirmed display username to Cognito email for client-side sign-in. |

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
| `AuthCodeExpiredError`                       | `400`  | `{ "code": "ExpiredCodeException", "message": "..." }`                                                                      |
| `UsernameReservationError`                   | `400`  | `{ "code": "InvalidUsernameException", "message": "..." }`                                                                  |
| `CognitoSignInError`                         | `400`  | `{ "code": error.code, "message": "..." }`                                                                                  |
| `ClientInputError`                           | `400`  | `{ "message": "..." }`                                                                                                      |
| AWS `ClientError` outside handled auth cases | `502`  | `{ "message": "AWS storage operation failed." }`                                                                            |
| `zipfile.BadZipFile`                         | `400`  | `{ "message": "The uploaded file is not a readable ZIP archive." }`                                                         |

Frontend auth error mapping lives in `getAuthErrorMessage()` in `AuthPage`. Known mapped codes include:

- `AuthNotConfigured`
- `CodeMismatchException`
- `ExpiredCodeException`
- `InvalidPasswordException`
- `InvalidUsernameException`
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
- Password policy: minimum 8, uppercase, lowercase, number, no required symbol.
- Attributes: required `email`, mutable optional `name`.
- Lambda triggers:
  - `PreSignUp`: `AuthUsernameFunction`
  - `PostConfirmation`: `AuthUsernameFunction`
  - `CustomEmailSender`: `AuthEmailSenderFunction`
- Verification messages use code flow.

Because the main registration path is backend-owned and creates users with admin APIs, Cognito `PreSignUp` and `PostConfirmation` are mostly protective for Cognito-native flows. Username reservation for the app's normal sign-up happens directly in backend application code.

### Cognito App Client

Current settings:

- `GenerateSecret: false`
- Explicit auth flows:
  - `ALLOW_USER_PASSWORD_AUTH`
  - `ALLOW_USER_SRP_AUTH`
  - `ALLOW_REFRESH_TOKEN_AUTH`
- `PreventUserExistenceErrors: ENABLED`
- Access token validity: 1 hour.
- ID token validity: 1 hour.
- Refresh token validity: 30 days.

The current frontend uses `USER_PASSWORD_AUTH` and `REFRESH_TOKEN_AUTH`. It does not use SRP even though the app client permits it.

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
- Current CSP `connect-src` allows `'self'` and `https://*.amazonaws.com`, which covers Cognito, the Lambda Function URL, and S3 presigned upload URLs.

AWS:

- Lambda Function URL CORS `AllowOrigins` comes from SAM parameter `AllowedOrigins`.
- Lambda Function URL allows `GET`, `POST`, `PUT`.
- Lambda Function URL allows headers `authorization` and `content-type`.
- S3 upload CORS also uses `AllowedOrigins`, allows `PUT`, exposes `ETag`, and accepts all headers.

Deployment must keep these aligned:

1. Cloudflare Pages origin must be included in SAM `AllowedOrigins`.
2. `VITE_LEARNING_BACKEND_URL` must point at the deployed `LearningBackendFunctionUrl`.
3. `VITE_COGNITO_REGION`, `VITE_COGNITO_USER_POOL_ID`, and `VITE_COGNITO_CLIENT_ID` must match the same SAM stack outputs.
4. CSP must continue allowing the Cognito, Lambda Function URL, and S3 upload origins.

Current `backend/aws/learning-backend/samconfig.toml` deploy defaults use stack `smile-learning-backend`, region `ap-southeast-1`, profile `smile-dev`, and `AllowedOrigins` for local dev plus `https://smile-project.pages.dev`.

## Environment Mapping After Backend Deploy

SAM outputs map to frontend env like this:

| SAM output                   | Frontend env                |
| ---------------------------- | --------------------------- |
| `LearningBackendFunctionUrl` | `VITE_LEARNING_BACKEND_URL` |
| `CognitoRegion`              | `VITE_COGNITO_REGION`       |
| `CognitoUserPoolId`          | `VITE_COGNITO_USER_POOL_ID` |
| `CognitoUserPoolClientId`    | `VITE_COGNITO_CLIENT_ID`    |

Backend auth-related environment is set by SAM:

| Backend env                          | Source or default                            |
| ------------------------------------ | -------------------------------------------- |
| `UPLOAD_BUCKET`                      | `DatasetUploadBucket`                        |
| `LEARNING_PROGRESS_TABLE`            | `LearningProgressTable`                      |
| `USERNAME_RESERVATION_TABLE`         | `UsernameReservationTable`                   |
| `AUTH_COOLDOWN_TABLE`                | `AuthCooldownTable`                          |
| `AUTH_RESEND_COOLDOWN_SECONDS`       | `30`                                         |
| `AUTH_CONFIRMATION_CODE_TTL_SECONDS` | `300`                                        |
| `COGNITO_USER_POOL_ID`               | `SmileUserPool`                              |
| `COGNITO_CLIENT_ID`                  | `SmileUserPoolClient`                        |
| `COGNITO_REGION`                     | AWS region                                   |
| `COGNITO_EMAIL_SENDER_KMS_KEY_ARN`   | `CognitoEmailSenderKmsKey` for custom sender |
| `RESEND_API_KEY_SECRET_ID`           | `ResendApiKeySecretName` parameter           |
| `RESEND_FROM_EMAIL`                  | `ResendFromEmail` parameter                  |
| `RESEND_REPLY_TO_EMAIL`              | `ResendReplyToEmail` parameter               |

Local backend code also supports direct `RESEND_API_KEY`, `RESEND_API_URL`, and AWS SDK region env values, but the SAM path uses Secrets Manager for the Resend key.

## Validation and Test Coverage

Frontend auth-related tests:

- `src/features/auth/auth-session.test.ts`
  - Stores auth session in `sessionStorage`.
  - Does not persist refresh token in stored JSON.
  - Migrates and removes legacy `localStorage` auth session.
  - Clears current and legacy storage.
- `src/features/auth/auth-context.test.tsx`
  - Refreshes an open session before token expiry.
  - Stores refreshed tokens without putting refresh token in persisted JSON.
- `src/features/auth/cognito-auth.test.ts`
  - Starts sign-up through learning backend.
  - Confirms sign-up through learning backend with password.
  - Resolves username through backend without sending password, then signs in through Cognito.
- `src/features/learning/api/learning-backend.test.ts`
  - Does not call backend upload endpoints without signed-in session.
  - Sends `Authorization: Bearer <idToken>` for guided backend calls.
  - Refreshes stale token before guided backend requests.
- `src/features/learning/progress/learning-progress.test.tsx`
  - Merges guest progress into signed-in account.
  - Clears guest bucket after remote save.
  - Hides and clears account progress after logout.
- `src/app/App.test.tsx`
  - Covers guest auth modal before opening auth-required guided-download lesson.
  - Covers signed-in access to that lesson.

Backend auth-related tests in `backend/aws/learning-backend/tests/test_app.py` cover:

- Rejecting guest session/body for dataset tools.
- Username reservation pending and confirmed states.
- Duplicate username rejection.
- Username sign-in resolution from confirmed reservations only.
- Resend cooldown helper behavior.
- Backend-owned sign-up storage, code hashing, email sending, and cooldown.
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

- `getAuthAuthorizationHeader()` in `auth-session.ts` returns a bearer ID token but is currently unused. Current learning backend clients call `getFreshStoredAuthSession()` instead.
- `reserve_confirmation_resend()` and `assert_confirmation_code_is_active()` in backend code are tested helpers but are not the main HTTP pending-sign-up flow. The HTTP flow uses the pending sign-up item's `nextAllowedAt`, `expiresAt`, and `attempts`.
- Frontend sends `idToken` to the learning backend. Backend accepts both ID and access tokens, but if the frontend switches to access tokens, verify downstream assumptions around `email` because access tokens may not include the same claims as ID tokens.
- `AuthProvider` may hold an expired session during startup until refresh/check completes. Use `isReady` when route behavior depends on knowing auth state.
- A session can be visible after reload without a refresh token. It will be cleared when it reaches the 5 minute refresh window and cannot refresh.
- Username sign-in sends only username to the backend. Do not add password to `/auth/username/resolve`.
- Registration confirmation sends password to the backend by design. If that changes, the whole backend-owned Cognito user creation model must be redesigned.
- The user pool app client permits SRP, but the current frontend uses `USER_PASSWORD_AUTH`. A switch to SRP would affect `cognito-auth.ts` and tests.
- Cognito user pool self-sign-up is disabled. Enabling it would bypass the backend-owned pending sign-up policy unless Cognito triggers are hardened and the frontend flow is rewritten.
- `name` in Cognito is the display username, not a full name.
- Confirmed username reservations never expire because `expiresAt` is removed.
- Pending sign-up responses avoid user enumeration in resend by returning `ok` even when no active pending sign-up exists.
- Protected backend authorization is app-level inside Lambda because Function URL `AuthType` is `NONE`.
- CSP and SAM CORS must be updated together when origins change.
- There is no frontend password reset flow yet. Backend email copy supports `CustomEmailSender_ForgotPassword`, but no UI starts that Cognito flow.
