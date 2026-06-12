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
  description = "Bedrock model or inference profile ID for Claude"
  type        = string
  default     = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
}

variable "allowed_origins" {
  description = "CORS origins permitted to call the tutor API"
  type        = list(string)
  default     = ["*"] # tighten to the CloudFront domain after first deploy
}
