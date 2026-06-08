# Smile Learning Backend

AWS SAM backend for dataset ZIP upload and Pandas loading validation.

## Authentication Documentation

For the full frontend/backend authentication architecture, flows, API contracts, and production hardening checklist, see [`AUTHENTICATION.md`](./AUTHENTICATION.md).

## Endpoints

- `POST /uploads/presign`: creates a temporary S3 PUT URL for a signed-in Cognito user.
- `POST /datasets/inspect`: reads the signed-in user's uploaded ZIP, finds the first CSV, and returns the `data/...` path.
- `POST /pandas/validate`: runs restricted Pandas code against the signed-in user's extracted CSV.
- `POST /auth/sign-up/start`: starts a backend-owned pending sign-up with email and username, then sends the verification code through Resend.
- `POST /auth/confirmation/confirm`: verifies the backend-owned sign-up code, creates the Cognito user with admin APIs, and confirms the username reservation.
- `POST /auth/confirmation/resend`: resends the backend-owned sign-up code with a backend-enforced cooldown.
- `POST /auth/email/sign-in`: signs in with email through backend-enforced public auth cooldowns.
- `POST /auth/username/sign-in`: signs in with a confirmed display username without returning the resolved account email.
- `POST /auth/oauth/google/start`: starts Cognito Google OAuth with signed state and PKCE stored in a short-lived HttpOnly cookie.
- `POST /auth/oauth/google/callback`: exchanges the Google OAuth authorization code through Cognito, sets the refresh-session cookie, and returns access/ID tokens without returning the refresh token.
- `POST /auth/oauth/microsoft/start`: starts Cognito Microsoft OAuth with signed state and PKCE stored in a short-lived HttpOnly cookie.
- `POST /auth/oauth/microsoft/callback`: exchanges the Microsoft OAuth authorization code through Cognito, sets the refresh-session cookie, and returns access/ID tokens without returning the refresh token.
- `POST /auth/username/resolve`: deprecated compatibility route that returns a generic sign-in failure if reached directly in local/dev; it is not exposed by the production Cloudflare Pages proxy.
- `POST /auth/session/bootstrap`: restores an in-memory Cognito bearer session from the signed HttpOnly refresh-session cookie.
- `POST /auth/session/refresh`: refreshes an in-memory Cognito bearer session through backend-owned Cognito auth.
- `POST /auth/session/revoke`: best-effort Cognito refresh-token revocation and refresh cookie clearing.
- `POST /auth/password-reset/request`: starts Cognito password reset through backend-enforced public auth cooldowns.
- `POST /auth/password-reset/confirm`: confirms Cognito password reset through backend-enforced public auth cooldowns.
- `GET /health`: basic health check.

The backend does not execute submitted learner code with `exec` or `eval`. It compiles the submitted Python to get real syntax errors, extracts the allowed `pd.read_csv(...)` path from the AST, then runs Pandas from trusted backend code and returns the real dataframe output or Python/Pandas runtime error.

Dataset upload, inspection, validation, and progress endpoints require `Authorization: Bearer <Cognito access token>`.

Usernames are reserved while a backend-owned sign-up is pending, then marked confirmed only after the backend verifies the code and creates the Cognito user. Pending reservations are not accepted for username sign-in. Username sign-in sends the username and password to the backend; the backend resolves the account email internally, calls Cognito, returns only access/ID tokens, sets the refresh token in a signed HttpOnly cookie, and never returns the resolved email. Unknown usernames take a deterministic dummy Cognito auth path before returning the same generic sign-in failure.

The Cognito app client is confidential (`GenerateSecret: true`). Browser code does not call Cognito directly for password sign-in, username sign-in, password reset, federated OAuth token exchange, or refresh. The backend owns those calls, sends Cognito `SECRET_HASH` or confidential OAuth client authentication, and uses `AdminInitiateAuth` for password and refresh-token auth. Do not re-enable public `USER_PASSWORD_AUTH` or `USER_SRP_AUTH` on the app client.

Google and Microsoft sign-in use Cognito Hosted UI only for the federated redirect. `/auth/oauth/<provider>/start` creates state and PKCE verifier values in a signed short-lived HttpOnly cookie, then returns the Cognito authorization URL. `/auth/oauth/<provider>/callback` validates the state cookie and redirect URI, exchanges the authorization code from the backend, stores Cognito's refresh token in the same signed refresh-session cookie used by email/password login, and clears the OAuth state cookie.

Session refresh and revoke requests rely on the signed HttpOnly refresh-session cookie as the only refresh-token source. Refresh requests may include the Cognito `sub` for proxy rate limiting, but the Lambda derives the authoritative refresh token and user `sub` from the signed cookie; requests do not send account email or JSON refresh tokens. A reload uses `/auth/session/bootstrap` to restore the in-memory access/ID token session from that cookie.

Frontend, backend validation, and Cognito policy require passwords to be at least 12 characters and include lowercase, uppercase, number, and symbol.

The Cognito user pool has deletion protection enabled. The app client has token revocation enabled and a 7 day refresh-token validity window, which matches the memory-only browser session posture.

Public auth endpoints use DynamoDB-backed cooldowns by request source and identifier, and sign-in routes also use longer burst caps by source and identifier. Browser traffic should reach this backend through the Cloudflare Pages `/api/learning-backend` proxy. Cloudflare zone rate limiting should block coarse source/IP abuse before Pages Functions or AWS run; see [`../../../docs/cloudflare-auth-rate-limiting.md`](../../../docs/cloudflare-auth-rate-limiting.md) for the managed rule and deploy command. The Pages proxy uses Upstash Redis for shared source/IP auth limiter state when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured, falls back to a local limiter for development or Redis outages, enforces exact route/method allowlists, validates that `LEARNING_BACKEND_URL` is a trusted HTTPS Lambda Function URL, rejects oversized request bodies, forwards only whitelisted auth cookies to cookie-backed auth routes, strips query strings, and forwards `Authorization` only to protected backend routes. Keep the Pages Function env `LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS` unset when using the Cloudflare Free-plan-compatible single rule; set it to `false` only if Cloudflare has equivalent granular route-specific auth rate limits. Keep the backend DynamoDB limiter enabled because it owns email/username/user-sub and verification-attempt controls. The deprecated username resolution compatibility route is not exposed by the production proxy. The proxy and Lambda must share `LEARNING_BACKEND_PROXY_SECRET`; Lambda trusts only the proxy's `cf-connecting-ip` source header when that secret matches and otherwise falls back to the Function URL source IP. Production deploys keep `LEARNING_BACKEND_REQUIRE_PROXY_SECRET=true`, so direct Lambda Function URL app requests can only use `/health`; non-health app routes must arrive through the proxy.

Sign-up emails are sent directly by the backend through Resend. Other Cognito auth emails, such as password recovery, still use a Cognito custom email sender trigger. Cognito encrypts those codes with a stack-owned KMS key, the Lambda decrypts the code, then sends the email through Resend.

Cognito public self-signup is disabled. Sign-up confirmation codes are tracked by the app backend and accepted for 5 minutes, so the backend is the authoritative policy owner for sign-up expiry, resend cooldown, and failed-code attempts.

Store the Resend API key in Secrets Manager before deploying:

```bash
aws secretsmanager create-secret \
  --name smile/resend/api-key \
  --secret-string '{"apiKey":"re_REPLACE_WITH_REAL_KEY"}' \
  --region ap-southeast-1 \
  --profile smile-dev
```

If the secret already exists, update it with `aws secretsmanager put-secret-value --secret-id smile/resend/api-key --secret-string '{"apiKey":"re_REPLACE_WITH_REAL_KEY"}'`.

## Validate Locally

```bash
python3 -m unittest discover -s backend/aws/learning-backend/tests
sam validate --template-file backend/aws/learning-backend/template.yaml --region ap-southeast-1 --profile smile-dev
```

## Deploy

Deploy only after confirming the Cloudflare Pages origin to allow in S3 CORS. Keep `FunctionUrlAllowedOrigins` limited to local/dev origins because production browser traffic must use the Cloudflare Pages proxy.

Manual deploys must pass the required and sensitive parameters explicitly. `AuthConfirmationCodePepper`, `LearningBackendProxySecret`, and Google client secrets are intentionally not stored in `samconfig.toml`.

```bash
cd backend/aws/learning-backend
rm -rf .aws-sam
sam build --template-file template.yaml
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name smile-learning-backend \
  --region ap-southeast-1 \
  --profile smile-dev \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    AllowedOrigins="http://127.0.0.1:5317,http://localhost:5317,https://learn.smilelab.me,https://smile-project.pages.dev" \
    FunctionUrlAllowedOrigins="http://127.0.0.1:5317,http://localhost:5317" \
    ResendApiKeySecretName="smile/resend/api-key" \
    AuthConfirmationCodePepper="REPLACE_WITH_RANDOM_SECRET_AT_LEAST_32_CHARS" \
    LearningBackendProxySecret="REPLACE_WITH_SAME_SECRET_AS_CLOUDFLARE" \
    LearningBackendRequireProxySecret="true" \
    GoogleOAuthClientId="REPLACE_WITH_GOOGLE_CLIENT_ID.apps.googleusercontent.com" \
    GoogleOAuthClientSecret="REPLACE_WITH_GOOGLE_CLIENT_SECRET" \
    MicrosoftOAuthClientId="REPLACE_WITH_MICROSOFT_CLIENT_ID" \
    MicrosoftOAuthClientSecret="REPLACE_WITH_MICROSOFT_CLIENT_SECRET" \
    MicrosoftOAuthIssuer="https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0" \
    CognitoOAuthDomainPrefix="smile-learn-auth" \
    CognitoOAuthCallbackUrls="https://learn.smilelab.me/auth/callback/google,https://learn.smilelab.me/auth/callback/microsoft,https://smile-project.pages.dev/auth/callback/google,https://smile-project.pages.dev/auth/callback/microsoft" \
    CognitoOAuthLogoutUrls="https://learn.smilelab.me/learn,https://smile-project.pages.dev/learn"
```

Keep `CognitoOAuthDomainPrefix` stable after federated sign-in is live; changing it creates a different Cognito Hosted UI domain and requires matching provider-console redirect URI updates. Do not include `http://localhost` or `http://127.0.0.1` in `CognitoOAuthCallbackUrls` or `CognitoOAuthLogoutUrls` for an OAuth-enabled Cognito app client.

The template default sender is `Smile Lab <auth@smilelab.me>`. If you override `ResendFromEmail`, verify the Lambda environment after deploy because shell and SAM parameter quoting can split display names with spaces.

Google sign-in is disabled unless all Google OAuth parameters are provided. For production, create a Google OAuth web client whose authorized redirect URI is Cognito's IdP response URL, for example `https://smile-learn-auth.auth.ap-southeast-1.amazoncognito.com/oauth2/idpresponse`. Then deploy with `GoogleOAuthClientId`, `GoogleOAuthClientSecret`, `CognitoOAuthDomainPrefix`, `CognitoOAuthCallbackUrls`, and `CognitoOAuthLogoutUrls`. `CognitoOAuthCallbackUrls` must contain app callback URLs such as `https://learn.smilelab.me/auth/callback/google`. Cognito OAuth callback/logout URLs must be HTTPS; use an HTTPS tunnel rather than `http://localhost` for local OAuth testing.

Microsoft sign-in is disabled unless `MicrosoftOAuthClientId`, `MicrosoftOAuthClientSecret`, and `CognitoOAuthDomainPrefix` are provided. Create a Microsoft Entra app registration with a web redirect URI pointing to the same Cognito IdP response URL, for example `https://smile-learn-auth.auth.ap-southeast-1.amazoncognito.com/oauth2/idpresponse`. The default `MicrosoftOAuthIssuer` supports personal Microsoft accounts only; use `https://login.microsoftonline.com/<TENANT_ID>/v2.0` for one work/school tenant. Do not use `/common` with Cognito because Microsoft returns tenant-specific token issuers and Cognito requires an exact issuer match.

For federated OAuth deployment and troubleshooting notes, see the "Federated OAuth Troubleshooting" section in [`AUTHENTICATION.md`](./AUTHENTICATION.md).

Build the frontend for production with `VITE_LEARNING_BACKEND_URL=/api/learning-backend` so backend traffic uses the Cloudflare Pages proxy. Configure Cloudflare Pages Function env `LEARNING_BACKEND_URL` from the SAM `LearningBackendFunctionUrl` output; the proxy rejects non-HTTPS, credentialed, path-scoped, or non-Lambda Function URL origins before forwarding sensitive headers. Configure the same random value as SAM `LearningBackendProxySecret` plus Cloudflare Pages Function secret `LEARNING_BACKEND_PROXY_SECRET`. Leave `LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS` unset for the Cloudflare Free-plan-compatible single auth rule; set it to `false` only when Cloudflare has equivalent granular route-specific auth rate limits.
