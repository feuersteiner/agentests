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

TERRAFORM_VERSION=1.9.5
# SHA-256 of each terraform_${TERRAFORM_VERSION}_<os>_<arch>.zip, from the release's SHA256SUMS.
case "${os}_${arch}" in
  linux_amd64) terraform_sha256=e3d9757fb9c4e90c6d38dbc6ac0b8a2fb267ea28f1cc15c0f7c87e5071e8bbb1 ;;
  linux_arm64) terraform_sha256=93cfce050ff866da9c3cfe6571485c47b8db950bd26cd853508e5ef7aaf7f32b ;;
  darwin_amd64) terraform_sha256=6d0fe41ac399aa277260456aa4cedf2df349df96307d874706239c21d7a2c18e ;;
  darwin_arm64) terraform_sha256=1e59660aaa79139c0624705a5389284b8fa5bd997f96cd383fdc3f4ccf1fc439 ;;
  *) echo "install-tools: no terraform build for ${os}_${arch}" >&2; exit 1 ;;
esac

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
zip="terraform_${TERRAFORM_VERSION}_${os}_${arch}.zip"
curl -fsSLo "$tmp/$zip" "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/$zip"
if command -v sha256sum >/dev/null; then
  echo "$terraform_sha256  $tmp/$zip" | sha256sum -c -
else
  echo "$terraform_sha256  $tmp/$zip" | shasum -a 256 -c -
fi
unzip -o -q "$tmp/$zip" terraform -d "$tmp"
mkdir -p "$BIN_DIR"
install -m 0755 "$tmp/terraform" "$BIN_DIR/terraform"
echo "install-tools: terraform $TERRAFORM_VERSION installed in $BIN_DIR"
