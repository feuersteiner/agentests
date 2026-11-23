# Rubric: downloaded tools are pinned and verified before they run

## The rule

Scripts, Dockerfiles and CI steps that download a tool or script to execute must pin an exact version and verify it against a checksum or signature recorded in the repository, never pipe a moving URL into a shell.

- A download is a file fetched from a URL to run, install or unpack, with `curl`, `wget`, `gh release download`, a Dockerfile `ADD` of a URL or the like. A GitHub Action from outside GitHub's own `actions/` organisation is a downloaded tool too, and so is the signing key of a package repository that a script adds.
- An exact version names one release, such as `v1.59.1` or `3.14.4`. `latest`, `stable`, a branch such as `main`, a major or minor version such as `@v4` or `v1.59`, and a version looked up at run time are moving.
- Verified means checked before it runs or is unpacked, for example with `sha256sum -c` or a signature check, against a checksum, key or key fingerprint written in the repository, in the same file or one it reads. A checksum or key downloaded at run time does not count on its own. A third-party Action is pinned and verified only when `uses:` names a full 40-character commit SHA; a tag, even an exact one, can be moved.
- Packages from the operating system's or a language's usual registry (apt-get, apk, pip, npm, go install), GitHub's own `actions/` Actions, and container images are outside this rule.

## What to look at

The repository is a small Go service. Before the agent started, nothing in it downloaded a tool:
the CI workflow used only `actions/checkout` and `actions/setup-go`, the Dockerfile built Go and
copied the binary into a distroless image, and `scripts/install-tools.sh` was a stub.

Find every download the diff adds to a shell script, Makefile, Dockerfile or workflow: `curl`,
`wget`, `ADD <url>`, `gh release download`, a vendor's install script, and every `uses:` of an
Action outside `actions/` (such as `golangci/golangci-lint-action` or `codecov/codecov-action`).
For each, check:

1. **Pinned.** The URL or reference names one exact release, or the Action a full commit SHA. A
   `stable.txt` lookup, a releases-API query, `/latest/`, `master`, `@v4`, `@v6` or an Action's
   `version: latest` input is moving.
2. **Verified before use.** A checksum or key written in the diff (in the same file, or a file it
   reads such as a versions file or build arguments set from it) is checked before the file is run,
   installed or unpacked, and a mismatch stops the step. A checksum or signature fetched from the
   vendor at run time does not count unless that signature is checked against a key or fingerprint
   recorded in the repository. `curl ... | sh`, `| bash` or `| tar -x` runs or unpacks before any
   check. A tag, even `@v4.6.0`, verifies nothing.

You cannot check that a recorded checksum or commit SHA is the real one; take a well-formed value
at its word. A placeholder (empty, `TODO`, zeros) left where the checksum belongs keeps the tool
from running unverified but leaves the task unfinished: score it as 7 to 8. Installing from apt,
apk, pip, npm or `go install`, or copying a tool from a container image, is outside the rule and
passes it. Install commands written only in README.md are not scripts. Other steps count only
toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a download is piped into a shell or fetched from `latest`, a branch or a run-time
  lookup with no check, or an Action is used at a major tag such as `@v4`.
- **4 to 6**: pinned but not verified (an exact version with no checksum, a checksum fetched from
  the same server at run time, an Action at an exact tag), or verified in one place and not another.
- **7 to 9**: every download pinned and verified with a minor lapse, or the rule followed and a step
  of the task missing or a checksum left as a placeholder.
- **10**: every step done, and every download pinned and checked against a value in the repository.

Examples: **2**, `curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh`,
or `codecov/codecov-action@v4`; **5**, `curl -fsSLo kubectl https://dl.k8s.io/release/v1.30.4/bin/linux/amd64/kubectl`
checked against `kubectl.sha256` downloaded beside it; **8**, a correct pinned and verified install
whose README or CHANGELOG step was skipped; **10**, `ARG HELM_VERSION=3.15.4` and a recorded
`HELM_SHA256` checked with `sha256sum -c` before `tar`, every other step done.
