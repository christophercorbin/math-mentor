output "api_url" {
  description = "Tutor API endpoint (same-origin via CloudFront; the raw function URL is IAM-protected)"
  value       = "https://${aws_cloudfront_distribution.web.domain_name}/api"
}

output "site_url" {
  description = "CloudFront URL of the MathMentor web app (CNAME target for the custom domain)"
  value       = "https://${aws_cloudfront_distribution.web.domain_name}"
}

output "custom_domain_url" {
  description = "Custom-domain URL once domain_ready=true"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "(disabled)"
}

# Add this CNAME in Cloudflare (DNS only / gray cloud) to validate the cert.
output "domain_validation_record" {
  description = "ACM validation CNAME to create in Cloudflare: name -> value"
  value = var.domain_name == "" ? {} : {
    for o in aws_acm_certificate.custom[0].domain_validation_options :
    o.resource_record_name => o.resource_record_value
  }
}
