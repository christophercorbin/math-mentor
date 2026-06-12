output "api_url" {
  description = "Lambda Function URL for the tutor API"
  value       = aws_lambda_function_url.tutor.function_url
}

output "site_url" {
  description = "CloudFront URL of the MathMentor web app"
  value       = "https://${aws_cloudfront_distribution.web.domain_name}"
}
