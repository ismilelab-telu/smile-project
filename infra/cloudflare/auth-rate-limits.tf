terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = ">= 5.0.0"
    }
  }
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID that serves the Smile production custom domain."
  type        = string
}

locals {
  smile_auth_ratelimit_rules = [
    {
      ref         = "smile-auth-public-routes-burst-ip"
      description = "Smile auth public routes burst by IP"
      paths = [
        "/api/learning-backend/auth/email/sign-in",
        "/api/learning-backend/auth/username/sign-in",
        "/api/learning-backend/auth/sign-up/start",
        "/api/learning-backend/auth/confirmation/resend",
        "/api/learning-backend/auth/confirmation/confirm",
        "/api/learning-backend/auth/password-reset/request",
        "/api/learning-backend/auth/password-reset/confirm",
        "/api/learning-backend/auth/session/bootstrap",
        "/api/learning-backend/auth/session/refresh",
        "/api/learning-backend/auth/session/revoke",
      ]
      period         = 10
      requests       = 10
      mitigation     = 10
      retry_after    = 10
    },
  ]
}

resource "cloudflare_ruleset" "smile_auth_rate_limits" {
  zone_id     = var.cloudflare_zone_id
  name        = "Smile auth rate limits"
  description = "Blocks abusive Smile authentication traffic at Cloudflare before it reaches Pages or AWS."
  kind        = "zone"
  phase       = "http_ratelimit"

  rules = [
    for rule in local.smile_auth_ratelimit_rules : {
      ref         = rule.ref
      description = rule.description
      expression = length(rule.paths) == 1 ? (
        format("(http.request.uri.path eq %q)", rule.paths[0])
      ) : (
        format("(http.request.uri.path in { %s })", join(" ", [for path in rule.paths : format("%q", path)]))
      )
      action  = "block"
      enabled = true

      action_parameters = {
        response = {
          status_code  = 429
          content_type = "application/json"
          content = jsonencode({
            code              = "AuthRateLimitExceededException"
            message           = "Too many auth requests. Please wait before trying again."
            retryAfterSeconds = rule.retry_after
          })
        }
      }

      ratelimit = {
        characteristics     = ["cf.colo.id", "ip.src"]
        period              = rule.period
        requests_per_period = rule.requests
        mitigation_timeout  = rule.mitigation
        requests_to_origin  = false
      }
    }
  ]
}
