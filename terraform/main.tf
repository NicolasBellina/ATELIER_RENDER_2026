terraform {
  required_providers {
    render = {
      source  = "render-oss/render"
      version = ">= 1.7.0"
    }
  }
}

provider "render" {
  api_key  = var.render_api_key
  owner_id = var.render_owner_id
}

resource "render_web_service" "flask_app" {
  name               = "flask-render-iac-${var.github_actor}"
  plan               = "free"
  region             = "frankfurt"
  health_check_path  = "/health"

  runtime_source = {
    image = {
      image_url = var.image_url
      tag       = var.image_tag
    }
  }

  env_vars = {
    ENV = {
      value = "production"
    }
    DATABASE_URL = {
      value = var.database_url
    }
  }
}

resource "render_web_service" "adminer" {
  name   = "adminer-${var.github_actor}"
  region = "frankfurt"
  plan   = "free"

  runtime_source = {
    image = {
      image_url = "adminer"
      tag       = "latest"
    }
  }

  env_vars = {
    ADMINER_DEFAULT_SERVER = {
      value = var.postgres_hostname
    }
  }
}

resource "render_static_site" "frontend" {
  name           = "react-${var.github_actor}"
  repo_url       = var.github_repo_url
  branch         = "main"
  root_directory = "frontend"
  build_command  = "npm install && npm run build"
  publish_path   = "build"
  auto_deploy    = true

  env_vars = {
    REACT_APP_API_URL = {
      value = render_web_service.flask_app.url
    }
  }

  depends_on = [render_web_service.flask_app]
}
