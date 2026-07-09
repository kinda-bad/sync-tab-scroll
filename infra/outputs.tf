output "project_id" {
  description = "Railway project ID."
  value       = railway_project.app.id
}

output "service_id" {
  description = "Railway service ID."
  value       = railway_service.app.id
}

output "service_url" {
  description = "Railway-assigned domain (*.up.railway.app). A custom domain is deferred (infrastructure.md [OPEN: custom domain])."
  value       = "https://${railway_service_domain.app.domain}"
}
