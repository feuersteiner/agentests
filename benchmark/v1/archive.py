#!/usr/bin/env python3
"""Explicit optional fixture download, verification and safe hydration (Python 3.10+)."""

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import urllib.request
import zipfile
import tempfile

VERSION = Path(__file__).resolve().parent
ROOT = VERSION.parent.parent
MANIFEST = VERSION / "archive-manifest.json"


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def inventory(files):
    records = [
        {"path": name, "mode": mode, "bytes": len(data), "sha256": sha256(data)}
        for name, mode, data in files
    ]
    encoded = json.dumps(records, sort_keys=True, separators=(",", ":")).encode()
    return {
        "files": len(files),
        "bytes": sum(len(data) for _, _, data in files),
        "inventory_sha256": sha256(encoded),
    }


def allowed(name, manifest):
    path = PurePosixPath(name)
    return (
        bool(path.parts)
        and not path.is_absolute()
        and path.as_posix() == name
        and all(part not in (".", "..") for part in path.parts)
        and "\\" not in name
        and name not in manifest["excluded"]
        and any(name.startswith(prefix + "/") for prefix in manifest["paths"])
    )


def validate(files, manifest):
    names = [name for name, _, _ in files]
    if len(names) != len(set(names)):
        raise ValueError("Duplicate archive paths")
    for name, mode, _ in files:
        if not allowed(name, manifest) or mode not in (0o644, 0o755):
            raise ValueError(f"Unsafe archive member: {name}")
    files.sort(key=lambda item: item[0])
    if inventory(files) != manifest["contents"]:
        raise ValueError("Corpus file count, byte count or inventory checksum mismatch")
    return files


def archive_path(manifest):
    return VERSION / "archives" / manifest["archive"]["name"]


def rebuild(manifest):
    commit = manifest["source"]["commit"]
    try:
        subprocess.run(
            ["git", "cat-file", "-e", f"{commit}^{{commit}}"],
            cwd=ROOT, check=True, capture_output=True,
        )
    except subprocess.CalledProcessError as error:
        raise ValueError(
            f"Pinned source commit {commit} is missing. Use a full clone, or fetch "
            f"it explicitly with: git fetch origin {commit}. Then repeat restore. "
            "Alternatively use restore to download the pinned fixture release."
        ) from error
    prefix = manifest["source"]["prefix"]
    listing = subprocess.check_output(
        ["git", "ls-tree", "-rz", commit, "--",
         *[prefix + path for path in manifest["paths"]]], cwd=ROOT,
    )
    files = []
    with subprocess.Popen(
        ["git", "cat-file", "--batch"], cwd=ROOT,
        stdin=subprocess.PIPE, stdout=subprocess.PIPE,
    ) as process:
        for entry in listing.split(b"\0"):
            if not entry:
                continue
            metadata, source_name = entry.decode().split("\t")
            mode, kind, object_id = metadata.split()
            name = source_name.removeprefix(prefix)
            if name in manifest["excluded"]:
                continue
            if kind != "blob" or mode not in ("100644", "100755"):
                raise ValueError(f"Unsupported source entry: {source_name}")
            process.stdin.write((object_id + "\n").encode())
            process.stdin.flush()
            header = process.stdout.readline().split()
            data = process.stdout.read(int(header[2]))
            if process.stdout.read(1) != b"\n":
                raise ValueError("Invalid Git object stream")
            files.append((name, int(mode, 8) & 0o777, data))
        process.stdin.close()
        if process.wait() != 0:
            raise ValueError("Git object recovery failed")
    validate(files, manifest)
    target = archive_path(manifest)
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as temporary:
        pending = Path(temporary.name)
    try:
        write_zip(pending, files)
        if sha256(pending.read_bytes()) != manifest["archive"]["sha256"]:
            raise ValueError("Rebuilt archive checksum mismatch; archive was not installed")
        os.replace(pending, target)
    finally:
        pending.unlink(missing_ok=True)
    return target


def write_zip(target, files):
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_STORED) as archive:
        for name, mode, data in files:
            member = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            member.create_system = 3
            member.external_attr = (0o100000 | mode) << 16
            archive.writestr(member, data)


def download(manifest):
    target = archive_path(manifest)
    url = manifest["archive"]["url"]
    if not url.startswith("https://github.com/feuersteiner/agentests/releases/download/"):
        raise ValueError("Unexpected fixture release URL")
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as temporary:
        pending = Path(temporary.name)
        try:
            with urllib.request.urlopen(url, timeout=60) as response:
                remaining = manifest["archive"]["bytes"]
                while remaining:
                    chunk = response.read(min(1024 * 1024, remaining))
                    if not chunk:
                        raise ValueError("Truncated fixture download")
                    temporary.write(chunk)
                    remaining -= len(chunk)
                if response.read(1):
                    raise ValueError("Oversized fixture download")
            temporary.flush()
            if sha256(pending.read_bytes()) != manifest["archive"]["sha256"]:
                raise ValueError("Downloaded fixture checksum mismatch")
            # Fully validate members before installing the downloaded ZIP.
            read_zip(pending, manifest)
            os.replace(pending, target)
        finally:
            pending.unlink(missing_ok=True)
    return target


def read_zip(target, manifest):
    if (target.stat().st_size != manifest["archive"]["bytes"]
            or sha256(target.read_bytes()) != manifest["archive"]["sha256"]):
        raise ValueError("Archive checksum mismatch. Recover with: python3 benchmark/v1/archive.py rebuild")
    files = []
    total = 0
    with zipfile.ZipFile(target) as archive:
        for member in archive.infolist():
            mode = member.external_attr >> 16
            total += member.file_size
            if (mode & 0o170000 != 0o100000 or member.is_dir()
                    or member.compress_type != zipfile.ZIP_STORED
                    or not allowed(member.filename, manifest)
                    or total > manifest["contents"]["bytes"]):
                raise ValueError(f"Unsafe archive member: {member.filename}")
            files.append((member.filename, mode & 0o7777, archive.read(member)))
    return validate(files, manifest)


def read_archive(manifest, rebuild_requested=False, allow_download=False):
    target = archive_path(manifest)
    if rebuild_requested:
        rebuild(manifest)
    elif not target.exists():
        if allow_download:
            download(manifest)
        else:
            raise ValueError("Fixture ZIP is absent. Explicitly run archive.py restore or rebuild")
    return read_zip(target, manifest)


def restore(files, destination):
    # Refuse symlinks throughout the destination, including existing parent paths.
    destination = destination.absolute()
    for parent in (destination, *destination.parents):
        if parent.is_symlink():
            raise ValueError(f"Symlink in destination: {parent}")
    for name, mode, data in files:
        target = destination / name
        for parent in (target, *target.parents):
            if parent == destination:
                break
            if parent.is_symlink():
                raise ValueError(f"Symlink in destination: {parent}")
        if target.exists() and (
            not target.is_file() or target.read_bytes() != data
            or target.stat().st_mode & 0o777 != mode
        ):
            raise ValueError(f"Refusing to overwrite changed file: {target}")
    for name, mode, data in files:
        target = destination / name
        if target.exists():
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("xb") as output:
            output.write(data)
        target.chmod(mode)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["restore", "verify", "rebuild"])
    parser.add_argument("--destination", type=Path, help="Optional test destination outside the checkout")
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text())
    if args.destination is not None:
        resolved = args.destination.resolve()
        if resolved == ROOT or ROOT in resolved.parents:
            parser.error("--destination must be outside the checkout; omit it for ignored default paths")
        if args.command != "restore":
            parser.error("--destination requires restore")
    files = read_archive(manifest, args.command == "rebuild", args.command == "restore")
    if args.command == "restore":
        restore(files, args.destination or VERSION / "workbench")
    print(f"{args.command}: verified {len(files)} files, {manifest['contents']['bytes']} bytes; "
          f"SHA-256 {manifest['archive']['sha256']}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, zipfile.BadZipFile, subprocess.CalledProcessError) as error:
        raise SystemExit(f"Error: {error}") from error
