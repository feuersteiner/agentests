#!/usr/bin/env python3
"""Explicitly package local evidence into the optional PRIVATE evidence checkout."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent
PRIVATE_URL = "https://github.com/feuersteiner/agentests-benchmark-evidence.git"

# Scan exports only. Never open an environment file or credential store.
SECRET_PATTERNS = [
    re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----.*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", re.S),
    re.compile(rb"\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16})\b"),
    re.compile(rb"(?i)\b(?:bearer\s+)[A-Za-z0-9._~+/-]{24,}=*"),
    re.compile(rb'''(?i)["']?(?:OPENAI_API_KEY|TYPESAFE_AI_API_KEY|ANTHROPIC_API_KEY|API_KEY|ACCESS_TOKEN|AUTH_TOKEN|PASSWORD|CLIENT_SECRET)["']?\s*[:=]\s*["']?([A-Za-z0-9_./+~=-]{20,})'''),
]
FORBIDDEN = {".git", "node_modules", ".aws", ".ssh", ".claude", "__pycache__"}
CREDENTIAL_FILES = {"auth.json", "credentials.json", ".credentials.json"}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def sanitize(data):
    count = 0
    for pattern in SECRET_PATTERNS:
        data, hits = pattern.subn(b"[REDACTED-CREDENTIAL]", data)
        count += hits
    return data, count


def verify_private(destination):
    if destination.is_symlink() or not (destination / ".git").exists():
        raise ValueError("Initialize the optional private submodule first")
    remote = subprocess.check_output(
        ["git", "remote", "get-url", "origin"], cwd=destination, text=True
    ).strip()
    if remote != PRIVATE_URL:
        raise ValueError("Unexpected evidence origin; refusing export")
    metadata = json.loads(subprocess.check_output(
        ["gh", "repo", "view", "feuersteiner/agentests-benchmark-evidence",
         "--json", "isPrivate,nameWithOwner"], text=True
    ))
    if metadata["isPrivate"] is not True:
        raise ValueError("Evidence repository must be private")


def pack(source, destination, version, batch):
    verify_private(destination)
    if not re.fullmatch(r"v[1-9][0-9]*", version) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*", batch):
        raise ValueError("Invalid version or batch name")
    source = source.resolve(strict=True)
    if not source.is_dir() or source == destination or source in destination.parents:
        raise ValueError("Choose one evidence directory outside the private checkout")
    output = destination / "archives" / version / f"{batch}.zip"
    manifest = destination / "manifests" / version / f"{batch}.json"
    if output.exists() or manifest.exists():
        raise ValueError("Batch already exists; use a new batch name")
    output.parent.mkdir(parents=True, exist_ok=True)
    manifest.parent.mkdir(parents=True, exist_ok=True)
    records, omitted, redactions = [], [], 0
    with tempfile.NamedTemporaryFile(dir=output.parent, delete=False) as temporary:
        pending = Path(temporary.name)
    try:
        with zipfile.ZipFile(pending, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            for path in sorted(source.rglob("*")):
                name = path.relative_to(source).as_posix()
                if any(part in FORBIDDEN or part in CREDENTIAL_FILES or part == ".env" or part.startswith(".env.") for part in path.relative_to(source).parts):
                    if path.is_file():
                        omitted.append(name)
                    continue
                if path.is_symlink():
                    raise ValueError("Symlinks are not exported")
                if not path.is_file():
                    continue
                original = path.read_bytes()
                data, hits = sanitize(original)
                redactions += hits
                info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
                mode = 0o755 if path.stat().st_mode & 0o111 else 0o644
                info.external_attr = (0o100000 | mode) << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, data)
                records.append({"path": name, "mode": mode, "source_bytes": len(original),
                                "source_sha256": digest(original), "export_bytes": len(data),
                                "export_sha256": digest(data), "credential_redactions": hits})
        if not records:
            raise ValueError("No exportable files in the selected batch")
        # Verify all exported bytes before installing; never change source files.
        with zipfile.ZipFile(pending) as archive:
            if archive.testzip() is not None:
                raise ValueError("Archive CRC verification failed")
            for record in records:
                if digest(archive.read(record["path"])) != record["export_sha256"]:
                    raise ValueError("Export checksum mismatch")
        summary = {"version": version, "batch": batch, "files": len(records),
                   "source_bytes": sum(r["source_bytes"] for r in records),
                   "export_bytes": sum(r["export_bytes"] for r in records),
                   "archive_bytes": pending.stat().st_size,
                   "archive_sha256": digest(pending.read_bytes()),
                   "credential_redactions": redactions, "omitted": omitted, "inventory": records}
        pending.rename(output)
        manifest.write_text(json.dumps(summary, indent=2) + "\n")
        return {key: value for key, value in summary.items() if key not in ("inventory", "omitted")}
    finally:
        pending.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="One local run or conversation batch")
    parser.add_argument("--version", required=True)
    parser.add_argument("--batch", required=True, help="New immutable batch name")
    parser.add_argument("--private", type=Path, default=ROOT / "private")
    args = parser.parse_args()
    print(json.dumps(pack(args.source, args.private.resolve(), args.version, args.batch)))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        raise SystemExit(f"Error: {error}") from error
