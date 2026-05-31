# Smile Learning Backend

AWS SAM backend for dataset ZIP upload and Pandas loading validation.

## Endpoints

- `POST /uploads/presign`: creates a temporary S3 PUT URL.
- `POST /datasets/inspect`: reads the uploaded ZIP, finds the first CSV, and returns the `data/...` path.
- `POST /pandas/validate`: validates the learner's Pandas loading code against the extracted CSV path.
- `GET /health`: basic health check.

The backend does not execute arbitrary learner code. It parses the submitted Python and only validates the expected `import pandas as pd`, `pd.read_csv(...)`, and `df.head()` pattern.

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
sam deploy --parameter-overrides 'AllowedOrigins="http://127.0.0.1:5317,http://localhost:5317,https://YOUR-CLOUDFLARE-PAGES-DOMAIN"'
```
