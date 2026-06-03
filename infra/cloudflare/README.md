# Cloudflare Infrastructure

This folder contains Terraform-compatible Cloudflare configuration for Smile production auth rate limiting.

Use the API deploy script in `scripts/cloudflare/apply-auth-rate-limits.ts` when you need to preserve unrelated existing `http_ratelimit` rules automatically.

Use Terraform when your Terraform state owns the zone `http_ratelimit` entry point ruleset:

```sh
terraform init
terraform plan \
  -var 'cloudflare_zone_id=REPLACE_WITH_ZONE_ID' \
  -var 'smile_auth_ratelimit_hosts=["learn.example.com"]'
```

Cloudflare allows one zone entry point ruleset per phase. If the zone already has an `http_ratelimit` ruleset, import it before applying this resource or use the API deploy script instead.

Required Cloudflare API token permission:

- `Zone WAF Write`
