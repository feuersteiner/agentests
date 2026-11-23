#!/usr/bin/env bash
# Installs the command-line tools that local development on slipway needs.
set -euo pipefail

BIN_DIR="${BIN_DIR:-$HOME/.local/bin}"
os="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "$(uname -m)" in
  x86_64 | amd64) arch=amd64 ;;
  arm64 | aarch64) arch=arm64 ;;
  *) echo "install-tools: unsupported machine $(uname -m)" >&2; exit 1 ;;
esac

# Always install the newest terraform release.
TERRAFORM_VERSION="$(curl -fsSL https://checkpoint-api.hashicorp.com/v1/check/terraform | sed -E 's/.*"current_version":"([^"]+)".*/\1/')"
zip="terraform_${TERRAFORM_VERSION}_${os}_${arch}.zip"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
curl -fsSLO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/$zip"
curl -fsSLO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_SHA256SUMS"
grep " $zip\$" "terraform_${TERRAFORM_VERSION}_SHA256SUMS" | sha256sum -c -
unzip -o -q "$zip" terraform
mkdir -p "$BIN_DIR"
install -m 0755 terraform "$BIN_DIR/terraform"
echo "install-tools: terraform $TERRAFORM_VERSION installed in $BIN_DIR"
