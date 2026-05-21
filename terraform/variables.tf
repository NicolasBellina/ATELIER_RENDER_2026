variable "render_api_key" {
  type      = string
  sensitive = true
}

variable "render_owner_id" {
  type = string
}

variable "image_url" {
  type = string
}

variable "image_tag" {
  type = string
}

variable "github_actor" {
  description = "GitHub username (lowercase)"
  type        = string
}

variable "github_repo_url" {
  description = "URL du dépôt GitHub pour le Static Site React"
  type        = string
}

variable "database_url" {
  description = "Internal Database URL PostgreSQL Render (postgresql://...)"
  type        = string
  sensitive   = true
}

variable "postgres_hostname" {
  description = "Hostname interne PostgreSQL Render pour Adminer"
  type        = string
  default     = "dpg-d87dmmn7f7vs73dgajo0-a"
}
