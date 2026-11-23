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

TERRAFORM_VERSION="${TERRAFORM_VERSION:-1.9.5}"
zip="terraform_${TERRAFORM_VERSION}_${os}_${arch}.zip"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
echo "install-tools: downloading terraform $TERRAFORM_VERSION"
curl -fsSLo "$tmp/$zip" "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/$zip"
unzip -o -q "$tmp/$zip" terraform -d "$tmp"
mkdir -p "$BIN_DIR"
install -m 0755 "$tmp/terraform" "$BIN_DIR/terraform"
"$BIN_DIR/terraform" version
