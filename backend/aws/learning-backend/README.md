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
- `POST /auth/username/resolve`: deprecated compatibility route that returns a generic sign-in failure if reached directly in local/dev; it is not exposed by the production Cloudflare Pages proxy.
- `POST /auth/session/bootstrap`: restores an in-memory Cognito bearer session from the signed HttpOnly refresh-session cookie.
- `POST /auth/session/refresh`: refreshes an in-memory Cognito bearer session through backend-owned Cognito auth.
- `POST /auth/session/revoke`: best-effort Cognito refresh-token revocation and refresh cookie clearing.
- `POST /auth/password-reset/request`: starts Cognito password reset through backend-enforced public auth cooldowns.
- `POST /auth/password-reset/confirm`: confirms Cognito password reset through backend-enforced public auth cooldowns.
- `GET /health`: basic health check.

The backend does not execute submitted learner code with `exec` or `eval`. It compiles the submitted Python to get real syntax errors, extracts the allowed `pd.read_csv(...)` path from the AST, then runs Pandas from trusted backend code and returns the real dataframe output or Python/Pandas runtime error.

Dataset upload, inspection, validation, and progress endpoints require `Authorization: Bearer <Cognito token>`.

Usernames are reserved while a backend-owned sign-up is pending, then marked confirmed only after the backend verifies the code and creates the Cognito user. Pending reservations are not accepted for username sign-in. Username sign-in sends the username and password to the backend; the backend resolves the account email internally, calls Cognito, returns only access/ID tokens, sets the refresh token in a signed HttpOnly cookie, and never returns the resolved email. Unknown usernames take a deterministic dummy Cognito auth path before returning the same generic sign-in failure.

The Cognito app client is confidential (`GenerateSecret: true`). Browser code does not call Cognito directly for password sign-in, username sign-in, password reset, or refresh. The backend owns those calls, sends Cognito `SECRET_HASH`, and uses `AdminInitiateAuth` for password and refresh-token auth. Do not re-enable public `USER_PASSWORD_AUTH` or `USER_SRP_AUTH` on the app client.

Session refresh requests send the Cognito `sub` and rely on the signed HttpOnly refresh-session cookie for the refresh token; they do not send account email. Refresh cooldowns are keyed by request source and `userSub`. A reload uses `/auth/session/bootstrap` to restore the in-memory access/ID token session from that cookie.

Frontend, backend validation, and Cognito policy require passwords to be at least 12 characters and include lowercase, uppercase, number, and symbol.

The Cognito user pool has deletion protection enabled. The app client has token revocation enabled and a 7 day refresh-token validity window, which matches the memory-only browser session posture.

Public auth endpoints use DynamoDB-backed cooldowns by request source and identifier, and sign-in routes also use longer burst caps by source and identifier. Browser traffic should reach this backend through the Cloudflare Pages `/api/learning-backend` proxy. Cloudflare zone rate limiting should block coarse source/IP abuse before Pages Functions or AWS run; see [`../../../docs/cloudflare-auth-rate-limiting.md`](../../../docs/cloudflare-auth-rate-limiting.md) for the managed rule and deploy command. The Pages proxy keeps a fallback source/IP limiter by default, enforces exact route/method allowlists, validates that `LEARNING_BACKEND_URL` is a trusted HTTPS Lambda Function URL, rejects oversized request bodies, forwards only the whitelisted refresh-session cookie to cookie-backed session routes, strips query strings, and forwards `Authorization` only to protected backend routes. Keep the Pages Function env `LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS` unset when using the Cloudflare Free-plan-compatible single rule; set it to `false` only if Cloudflare has equivalent granular route-specific auth rate limits. Keep the backend DynamoDB limiter enabled because it owns email/username/user-sub and verification-attempt controls. The deprecated username resolution compatibility route is not exposed by the production proxy. The proxy and Lambda must share `LEARNING_BACKEND_PROXY_SECRET`; Lambda trusts only the proxy's `cf-connecting-ip` source header when that secret matches and otherwise falls back to the Function URL source IP. Production deploys keep `LEARNING_BACKEND_REQUIRE_PROXY_SECRET=true`, so direct Lambda Function URL app requests can only use `/health`; non-health app routes must arrive through the proxy.

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

Deploy only after confirming the Cloudflare Pages origin to allow in S3 CORS. Keep `FunctionUrlAllowedOrigins` limited to local/dev origins because production browser traffic must use the Cloudflare Pages proxy:

```bash
cd backend/aws/learning-backend
sam build
sam deploy --parameter-overrides 'AllowedOrigins="http://127.0.0.1:5317,http://localhost:5317,https://YOUR-CLOUDFLARE-PAGES-DOMAIN" FunctionUrlAllowedOrigins="http://127.0.0.1:5317,http://localhost:5317" ResendApiKeySecretName="smile/resend/api-key" LearningBackendProxySecret="REPLACE_WITH_RANDOM_64_HEX" LearningBackendRequireProxySecret="true"'
```

The template default sender is `Smile Lab <auth@smilelab.me>`. If you override `ResendFromEmail`, verify the Lambda environment after deploy because shell and SAM parameter quoting can split display names with spaces.

Build the frontend for production with `VITE_LEARNING_BACKEND_URL=/api/learning-backend` so backend traffic uses the Cloudflare Pages proxy. Configure Cloudflare Pages Function env `LEARNING_BACKEND_URL` from the SAM `LearningBackendFunctionUrl` output; the proxy rejects non-HTTPS, credentialed, path-scoped, or non-Lambda Function URL origins before forwarding sensitive headers. Configure the same random value as SAM `LearningBackendProxySecret` plus Cloudflare Pages Function secret `LEARNING_BACKEND_PROXY_SECRET`. Leave `LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS` unset for the Cloudflare Free-plan-compatible single auth rule; set it to `false` only when Cloudflare has equivalent granular route-specific auth rate limits.
