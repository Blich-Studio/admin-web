# Admin Web (CMS) - Cloud Run Deployment

# Import existing Cloud Run service (remove after first successful apply)
import {
  to = module.admin_web.google_cloud_run_v2_service.main
  id = "projects/blichstudio-infras/locations/europe-west1/services/blich-cms"
}

provider "google" {
  project = data.terraform_remote_state.shared.outputs.project_id
  region  = data.terraform_remote_state.shared.outputs.region
}

data "terraform_remote_state" "shared" {
  backend = "gcs"
  config = {
    bucket = "blichstudio-infras-terraform-state"
    prefix = "terraform/state/shared"
  }
}

module "admin_web" {
  source = "../../terraform-modules/modules/cloud-run"

  service_name    = "blich-cms"
  environment     = data.terraform_remote_state.shared.outputs.environment
  region          = data.terraform_remote_state.shared.outputs.region
  project_id      = data.terraform_remote_state.shared.outputs.project_id
  container_image = var.container_image
  port            = 3000

  cpu_limit    = "1"
  memory_limit = "512Mi"

  min_instances = 0
  max_instances = 5

  cpu_idle          = true
  startup_cpu_boost = false
  request_timeout   = 300

  enable_vpc_access = false

  service_account_email = data.terraform_remote_state.shared.outputs.service_account_emails["admin-web"]
  allow_public_access   = true

  environment_variables = {
    NODE_ENV            = "production"
    NUXT_PUBLIC_API_URL = "https://api.blichstudio.com"
  }

  labels = { service = "admin-cms" }
}
