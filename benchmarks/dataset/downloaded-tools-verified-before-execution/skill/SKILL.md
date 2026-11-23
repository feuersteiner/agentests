---
name: downloaded-tools-verified-before-execution
description: Use whenever you write or change a shell script, Makefile, Dockerfile or GitHub Actions workflow that downloads something and then runs, installs or unpacks it - a CLI binary or release archive fetched with curl, wget or ADD, a vendor's install script (the usual `curl ... | sh`), or a third-party GitHub Action added with `uses:`. Typical cases are installing a tool in a CI job, adding a binary to a container image, and writing a setup or install script for developers. Covers version pinning, checksum or signature verification, and pinning Actions to a commit SHA.
---

# Downloaded tools are pinned and verified before they run

## The rule

Scripts, Dockerfiles and CI steps that download a tool or script to execute must pin an exact version and verify it against a checksum or signature recorded in the repository, never pipe a moving URL into a shell.

- A download is a file fetched from a URL to run, install or unpack, with `curl`, `wget`, `gh release download`, a Dockerfile `ADD` of a URL or the like. A GitHub Action from outside GitHub's own `actions/` organisation is a downloaded tool too, and so is the signing key of a package repository that a script adds.
- An exact version names one release, such as `v1.59.1` or `3.14.4`. `latest`, `stable`, a branch such as `main`, a major or minor version such as `@v4` or `v1.59`, and a version looked up at run time are moving.
- Verified means checked before it runs or is unpacked, for example with `sha256sum -c` or a signature check, against a checksum, key or key fingerprint written in the repository, in the same file or one it reads. A checksum or key downloaded at run time does not count on its own. A third-party Action is pinned and verified only when `uses:` names a full 40-character commit SHA; a tag, even an exact one, can be moved.
- Packages from the operating system's or a language's usual registry (apt-get, apk, pip, npm, go install), GitHub's own `actions/` Actions, and container images are outside this rule.

## Why

In 2021 attackers changed Codecov's Bash Uploader at its download URL so that it sent every CI
job's environment variables, tokens and keys included, to their server. Pipelines that ran it straight
from the URL did so for two months. It was caught by a customer who compared the script with
its published checksum; teams that checked the checksum before running it were not affected. A
URL, a `latest` link or a tag says where to fetch from, not what you get. Only a checksum or key
kept in your own repository says what you expect to run.

## How to apply it

1. Name one release in the URL or a variable (`TIDY_VERSION=2.4.1`), never `latest`,
   `main`, `stable.txt` or a releases-API lookup.
2. Record the release's SHA-256 (or the vendor's signing-key fingerprint) in the repository: in
   the script, as a Dockerfile `ARG` default, or in a versions file the script reads. Copy it from
   the vendor's published checksums once, when you choose the version.
3. Download to a file, check it (`echo "<sha256>  file" | sha256sum -c -`, `ADD --checksum=...`,
   or `gpg --verify` against the recorded key), and only then unpack, install or run it. A failed
   check must stop the script or step.
4. Pin third-party Actions to the full commit SHA of a release, with the tag as a comment, and give
   any tool-version input an exact version.

Common slips: `curl -fsSL https://.../install.sh | bash`; `curl ... | tar -xz`; a `releases/latest`
URL; downloading `tool.sha256` from the same server and checking against that; `uses: some/action@v3`.

## Example

Installing a vendor's `tidy` CLI in a CI job.

Violating: a moving URL, unpacked straight from the pipe with no check.

```yaml
- name: Install tidy
  run: curl -fsSL https://downloads.tidy.example/releases/latest/tidy-linux-amd64.tar.gz | tar -xz -C /usr/local/bin
```

Compliant: one release, checked against a checksum kept in the workflow before it is unpacked.

```yaml
- name: Install tidy
  env:
    TIDY_VERSION: 2.4.1
    TIDY_SHA256: 4f1c7e2a9b3d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7
  run: |
    curl -fsSLo /tmp/tidy.tar.gz "https://downloads.tidy.example/releases/${TIDY_VERSION}/tidy-linux-amd64.tar.gz"
    echo "${TIDY_SHA256}  /tmp/tidy.tar.gz" | sha256sum -c -
    tar -xzf /tmp/tidy.tar.gz -C /usr/local/bin
```

## Before you commit

Go through every script, Makefile, Dockerfile and workflow in the staged diff. For each download
and each third-party Action, check that it names one exact version or commit SHA, that it is
checked against a value recorded in the repository before it runs or is unpacked, and that nothing
is piped from a URL into a shell. Fix what does not hold and check again.
