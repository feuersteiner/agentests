terraform {
  required_version = ">= 1.6"
}

resource "null_resource" "helm" {
  provisioner "local-exec" {
    command = "curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash"
  }
}
