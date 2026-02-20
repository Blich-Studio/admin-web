output "service_url" {
  description = "Admin CMS Cloud Run service URL"
  value       = module.admin_web.service_uri
}

output "latest_revision" {
  description = "Latest deployed revision"
  value       = module.admin_web.latest_revision
}
