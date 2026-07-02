variable "project" {
  description = "Project name used as a resource prefix"
  type        = string
  default     = "math-mentor"
}

variable "region" {
  description = "AWS region (must have Bedrock model access enabled)"
  type        = string
  default     = "us-east-1"
}

variable "model_id" {
  description = "Bedrock model or inference profile ID for Claude. Uses the us. cross-region inference profile (routes through us-east-1/us-east-2/us-west-2 — requires the RegionRestriction SCP's bedrock:* carve-out)."
  type        = string
  default     = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
}

variable "alert_email" {
  description = "Email address for the monthly cost budget alerts"
  type        = string
  default     = "christophercorbin24@gmail.com"
}

variable "monthly_budget_usd" {
  description = "Monthly account cost budget (USD) that triggers alert emails"
  type        = string
  default     = "20"
}

# Custom domain — two-step flow because DNS lives in Cloudflare, not Route53:
#
#   Step 1: `tofu apply` (defaults). Terraform requests the ACM certificate and
#           outputs `domain_validation_record` — add that CNAME in Cloudflare
#           (DNS only / gray cloud). Also add the site CNAME:
#           mathmentor -> <site_url host> (DNS only / gray cloud).
#   Step 2: once both records exist, `tofu apply -var domain_ready=true`.
#           Terraform waits for the cert to validate, then attaches the alias
#           + cert to CloudFront and rewrites the canonical/OG URLs in the page.
variable "domain_name" {
  description = "Custom domain for the site. Empty string disables the custom-domain resources entirely."
  type        = string
  default     = "mathmentor.christophercorbin.cloud"
}

variable "domain_ready" {
  description = "Set true only after the ACM validation CNAME has been added in Cloudflare. Gates attaching the alias/cert to CloudFront."
  type        = bool
  default     = false
}
