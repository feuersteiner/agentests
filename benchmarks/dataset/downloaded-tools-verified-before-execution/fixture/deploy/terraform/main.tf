# The cluster resources slipway relies on: the namespace previews are
# installed into, and the service account slipway runs helm as.

terraform {
  required_version = ">= 1.6"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.31"
    }
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig
}

variable "kubeconfig" {
  type    = string
  default = "~/.kube/config"
}

resource "kubernetes_namespace" "previews" {
  metadata {
    name = "previews"
  }
}

resource "kubernetes_service_account" "slipway" {
  metadata {
    name      = "slipway"
    namespace = kubernetes_namespace.previews.metadata[0].name
  }
}
