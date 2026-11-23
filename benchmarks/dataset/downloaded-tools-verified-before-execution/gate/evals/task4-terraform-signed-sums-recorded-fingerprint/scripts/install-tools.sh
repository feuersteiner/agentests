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
# Fingerprint of HashiCorp's release signing key; the key itself is scripts/keys/hashicorp.asc.
HASHICORP_FINGERPRINT=C874011F0AB405110D02105534365D9472D7468F

here="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
export GNUPGHOME="$tmp/gnupg"
mkdir -m 700 "$GNUPGHOME"
gpg --batch --quiet --import "$here/keys/hashicorp.asc"
gpg --batch --with-colons --fingerprint | grep -q "^fpr:::::::::${HASHICORP_FINGERPRINT}:" \
  || { echo "install-tools: HashiCorp key fingerprint mismatch" >&2; exit 1; }

base="https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}"
sums="terraform_${TERRAFORM_VERSION}_SHA256SUMS"
zip="terraform_${TERRAFORM_VERSION}_${os}_${arch}.zip"
cd "$tmp"
curl -fsSLO "$base/$sums"
curl -fsSLO "$base/$sums.sig"
curl -fsSLO "$base/$zip"
gpg --batch --verify "$sums.sig" "$sums"
grep " $zip\$" "$sums" | sha256sum -c -
unzip -o -q "$zip" terraform
mkdir -p "$BIN_DIR"
install -m 0755 terraform "$BIN_DIR/terraform"
