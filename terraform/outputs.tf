output "flask_url" {
  description = "URL publique de l'API Flask"
  value       = render_web_service.flask_app.url
}

output "frontend_url" {
  description = "URL publique du frontend React"
  value       = render_static_site.frontend.url
}

output "service_name" {
  value = render_web_service.flask_app.name
}
