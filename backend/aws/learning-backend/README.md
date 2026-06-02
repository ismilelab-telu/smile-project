# Smile Learning Backend

AWS SAM backend for dataset ZIP upload and Pandas loading validation.

## Endpoints

- `POST /uploads/presign`: creates a temporary S3 PUT URL for a signed-in Cognito user.
- `POST /datasets/inspect`: reads the signed-in user's uploaded ZIP, finds the first CSV, and returns the `data/...` path.
- `POST /pandas/validate`: runs restricted Pandas code against the signed-in user's extracted CSV.
- `POST /auth/sign-up/start`: starts a backend-owned pending sign-up with email and username, then sends the verification code through Resend.
- `POST /auth/confirmation/confirm`: verifies the backend-owned sign-up code, creates the Cognito user with admin APIs, and confirms the username reservation.
- `POST /auth/confirmation/resend`: resends the backend-owned sign-up code with a backend-enforced cooldown.
- `POST /auth/username/resolve`: resolves a confirmed username to the Cognito email used for client-side sign-in.
- `GET /health`: basic health check.

The backend does not execute submitted learner code with `exec` or `eval`. It compiles the submitted Python to get real syntax errors, extracts the allowed `pd.read_csv(...)` path from the AST, then runs Pandas from trusted backend code and returns the real dataframe output or Python/Pandas runtime error.

Dataset upload, inspection, validation, and progress endpoints require `Authorization: Bearer <Cognito token>`.

Usernames are reserved while a backend-owned sign-up is pending, then marked confirmed only after the backend verifies the code and creates the Cognito user. Pending reservations are not accepted for username sign-in. Username sign-in resolves the email through the backend, then sends the password directly to Cognito from the client.

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

Deploy only after confirming the Cloudflare Pages origin to allow in CORS:

```bash
cd backend/aws/learning-backend
sam build
sam deploy --parameter-overrides 'AllowedOrigins="http://127.0.0.1:5317,http://localhost:5317,https://YOUR-CLOUDFLARE-PAGES-DOMAIN" ResendApiKeySecretName="smile/resend/api-key" ResendFromEmail="Smile Lab <auth@smilelab.me>"'
```
