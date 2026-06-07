# Cloudflare Auth Rate Limiting

Smile auth uses layered rate limiting:

- Cloudflare blocks coarse source/IP abuse before Pages Functions and AWS run.
- The Pages proxy uses Upstash Redis for persistent source/IP and endpoint-specific auth limits when configured, with a local fallback limiter for development and Redis outages.
- The AWS backend keeps identifier-aware limits for email, username, user sub, resend cooldowns, and failed verification attempts.
- Cognito remains the final password-reset and sign-in authority.

Do not remove the backend limiter. Cloudflare cannot reliably count by application email, username, user sub, or wrong verification-code attempts.

## Prerequisites

Cloudflare WAF Rate Limiting Rules are zone-level rules. A `pages.dev` hostname is not a zone you control, so production auth traffic needs a custom domain on a Cloudflare zone before these rules can protect it.

Required values:

- `CLOUDFLARE_API_TOKEN`: token with permission to read/edit zone rulesets.
- `CLOUDFLARE_ZONE_ID`: the zone that serves the Smile production custom domain.
- `UPSTASH_REDIS_REST_URL`: Upstash Redis REST URL for the Pages proxy auth limiter.
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST token for the Pages proxy auth limiter.

## Deploy

Dry-run first:

```sh
CLOUDFLARE_API_TOKEN=REPLACE_WITH_TOKEN \
CLOUDFLARE_ZONE_ID=REPLACE_WITH_ZONE_ID \
CLOUDFLARE_AUTH_RATELIMIT_DRY_RUN=true \
bun run cloudflare:auth-rate-limits
```

Apply:

```sh
CLOUDFLARE_API_TOKEN=REPLACE_WITH_TOKEN \
CLOUDFLARE_ZONE_ID=REPLACE_WITH_ZONE_ID \
bun run cloudflare:auth-rate-limits
```

The script manages the `http_ratelimit` phase entry point ruleset. It preserves unrelated rules, removes old Smile-managed rules by `ref`, and appends the current Smile rule at the end of the ruleset as required by Cloudflare.

The default payload is Cloudflare Free-plan compatible: one coarse path-only rule blocks more than 10 public auth path requests per 10 seconds from the same source/IP. Free-plan rate limit rules do not include host or method conditions, so the rule applies at the zone level to the exact auth proxy paths. Cloudflare's API still requires `cf.colo.id` in `characteristics` because rate-limit counting is processed per Cloudflare location, even though the user-facing counter is by IP. Keep the Pages proxy and backend limiters enabled for endpoint-specific cooldowns such as sign-in burst caps, resend cooldowns, and verification-code attempts. In production, configure Upstash Redis so the Pages proxy limiter is shared across Pages Function isolates.

Terraform-compatible configuration is also available in [`../infra/cloudflare/auth-rate-limits.tf`](../infra/cloudflare/auth-rate-limits.tf). Use it when Terraform owns the zone `http_ratelimit` entry point ruleset. If the zone already has rules in that phase and they are not imported to Terraform state, prefer the API script because it preserves unrelated existing rules automatically.

## Rule

The managed rule covers exact paths:

- `/api/learning-backend/auth/email/sign-in`
- `/api/learning-backend/auth/username/sign-in`
- `/api/learning-backend/auth/sign-up/start`
- `/api/learning-backend/auth/confirmation/resend`
- `/api/learning-backend/auth/confirmation/confirm`
- `/api/learning-backend/auth/password-reset/request`
- `/api/learning-backend/auth/password-reset/confirm`
- `/api/learning-backend/auth/session/bootstrap`
- `/api/learning-backend/auth/session/refresh`
- `/api/learning-backend/auth/session/revoke`

Blocked requests receive JSON:

```json
{
  "code": "AuthRateLimitExceededException",
  "message": "Too many auth requests. Please wait before trying again.",
  "retryAfterSeconds": 10
}
```

`retryAfterSeconds` is static because Cloudflare custom responses cannot compute the remaining window dynamically. Backend rate-limit responses still return dynamic retry values.

## Pages Proxy Limiter

With the current Free-plan-compatible one-rule Cloudflare payload, keep the Cloudflare Pages Function limiter enabled:

```sh
LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS=true
```

Leaving the value unset has the same effect. Set `LEARNING_BACKEND_PROXY_AUTH_RATE_LIMITS=false` only if Cloudflare has granular route-specific auth rules that provide equivalent source/IP protection to the proxy limiter.

Set the Upstash values as Cloudflare Pages secrets:

```sh
bunx wrangler pages secret put UPSTASH_REDIS_REST_URL --project-name smile-project
bunx wrangler pages secret put UPSTASH_REDIS_REST_TOKEN --project-name smile-project
```

If either Upstash value is missing, the Pages proxy uses the local in-memory limiter. If Upstash is configured but temporarily unavailable, the proxy falls back to the same local limiter instead of allowing repeated auth attempts through unchecked.

## Origin Lock

Cloudflare rate limiting only protects traffic that enters through Cloudflare. Keep the AWS Lambda Function URL locked behind the Pages proxy secret:

- Cloudflare Pages Function secret: `LEARNING_BACKEND_PROXY_SECRET`
- SAM parameter: `LearningBackendProxySecret`
- SAM parameter: `LearningBackendRequireProxySecret=true`

With that production setting, direct Lambda Function URL app routes fail closed unless the shared proxy secret is present.
