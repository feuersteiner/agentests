# Downloaded tools are pinned and verified before they run

Shell scripts, Makefiles, Dockerfiles and GitHub Actions workflows sometimes download a tool, an
installer script or a release archive and then run, install or unpack it, or use a GitHub Action
from another organisation. In every such file:

Scripts, Dockerfiles and CI steps that download a tool or script to execute must pin an exact version and verify it against a checksum or signature recorded in the repository, never pipe a moving URL into a shell.

- A download is a file fetched from a URL to run, install or unpack, with `curl`, `wget`, `gh release download`, a Dockerfile `ADD` of a URL or the like. A GitHub Action from outside GitHub's own `actions/` organisation is a downloaded tool too, and so is the signing key of a package repository that a script adds.
- An exact version names one release, such as `v1.59.1` or `3.14.4`. `latest`, `stable`, a branch such as `main`, a major or minor version such as `@v4` or `v1.59`, and a version looked up at run time are moving.
- Verified means checked before it runs or is unpacked, for example with `sha256sum -c` or a signature check, against a checksum, key or key fingerprint written in the repository, in the same file or one it reads. A checksum or key downloaded at run time does not count on its own. A third-party Action is pinned and verified only when `uses:` names a full 40-character commit SHA; a tag, even an exact one, can be moved.
- Packages from the operating system's or a language's usual registry (apt-get, apk, pip, npm, go install), GitHub's own `actions/` Actions, and container images are outside this rule.

A file that downloads nothing to run, install or unpack, such as a script that calls an API with
`curl` or checks a local server's health, has nothing to check.
