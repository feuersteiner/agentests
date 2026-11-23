---
name: pull-request-target-never-runs-pr-code
description: Use whenever you add or change a GitHub Actions workflow under .github/workflows/ that runs for pull requests and needs a secret or a write token - for example to deploy, comment on or label a pull request, upload results, or make CI work for pull requests from forks - and for any workflow triggered by pull_request_target or workflow_run. Covers which workflows may run the pull request's own code and how to hand its results to a privileged workflow.
---

# Privileged pull request workflows never run the pull request's code

## The rule

A GitHub Actions workflow triggered by pull_request_target (or workflow_run) that has secrets or write permissions must not check out and build, install or execute code from the pull request's head.

- A workflow has secrets or write permissions when any of its jobs uses a repository secret (`secrets.NAME`) or has a GITHUB_TOKEN that can write. Under pull_request_target and workflow_run the token can write unless `permissions` limits it to read access or none.
- Code from the pull request's head is every file the pull request can change, however the workflow gets it: a checkout of the pull request's head or merge ref, a checkout of `github.event.workflow_run.head_sha` or `head_branch` when the triggering run came from a pull request, `gh pr checkout`, or an artifact uploaded by a run that the pull request triggered.
- Installing its dependencies (`npm ci` runs the package's own scripts), building it, or running its tests, linter, scripts, Makefile or local actions executes it. Treating its files as data does not: listing changed files, posting a results file in a comment, uploading a coverage report, or deploying built static files.

## Why

`pull_request` runs a fork's code with no secrets and a read-only token, so it is safe.
`pull_request_target` and `workflow_run` run in the base repository's context, with its secrets and
a token that can push. Check out the pull request there and run `npm ci`, and any fork author can
put a `postinstall` script, a test or a build step in the pull request that steals the secrets or
pushes to the repository. GitHub Security Lab calls this a "pwn request" and found it in many real
projects. A label gate only moves the risk to the reviewer, who must spot it in every push.

## How to apply it

1. Run the pull request's code (install, build, test, lint, benchmark) only in a workflow on
   `pull_request`. Save what it produces, and the pull request number, with
   `actions/upload-artifact`.
2. Do the privileged part (deploy, comment, label, upload with a token) in a separate workflow on
   `workflow_run` for that workflow. Download the artifact with `actions/download-artifact`
   (`run-id: ${{ github.event.workflow_run.id }}`) and use it only as data. Check out nothing, or
   the default branch (`actions/checkout` with no `ref`), if you need trusted scripts.
3. A `pull_request_target` workflow may use the API on the pull request (labels, comments) as long
   as it does not check out and run the head. `actions/labeler` needs no checkout.
4. If a token is optional for forks (Codecov uploads tokenless from forks of public repositories),
   prefer that to giving fork runs a secret.
5. Set `permissions` to the least each workflow needs.

Common slips: switching `on: pull_request` to `pull_request_target` and adding
`ref: ${{ github.event.pull_request.head.sha }}` so the job "still tests the PR"; one
`pull_request_target` workflow with a read-only build job and a deploy job; a `workflow_run` job
that checks out `workflow_run.head_sha` and runs `npm ci`; running a script from the artifact.

## Example

Posting a bundle-size report on every pull request, forks included.

Violating: the fork's `package.json` scripts run with a write token.

```yaml
on: pull_request_target
permissions: { pull-requests: write }
jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: "${{ github.event.pull_request.head.sha }}" }
      - run: npm ci && npm run size > size.md
      - run: gh pr comment ${{ github.event.number }} --body-file size.md
        env: { GH_TOKEN: "${{ github.token }}" }
```

Compliant: `size.yml` on `pull_request` runs `npm ci && npm run size > size.md`, writes the number
to `pr.txt` and uploads both as the artifact `size`. Then:

```yaml
on:
  workflow_run: { workflows: [size], types: [completed] }
permissions: { pull-requests: write, actions: read }
jobs:
  comment:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: size, run-id: "${{ github.event.workflow_run.id }}", github-token: "${{ github.token }}" }
      - run: gh pr comment "$(tr -cd 0-9 < pr.txt)" --repo "$GITHUB_REPOSITORY" --body-file size.md
        env: { GH_TOKEN: "${{ github.token }}" }
```

## Before you commit

For each workflow in the staged diff that runs on `pull_request_target` or `workflow_run`, check
whether it has a secret or a write token and, if so, that no step checks out the pull request's
code and runs it, and no step runs a file from a downloaded artifact. Fix what does not hold.
