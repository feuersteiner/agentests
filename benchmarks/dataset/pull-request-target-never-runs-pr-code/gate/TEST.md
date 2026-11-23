# Privileged pull request workflows never run the pull request's code

GitHub Actions workflows under `.github/workflows/` that run on `pull_request_target` or
`workflow_run` run in the base repository's context. In every such workflow:

A GitHub Actions workflow triggered by pull_request_target (or workflow_run) that has secrets or write permissions must not check out and build, install or execute code from the pull request's head.

- A workflow has secrets or write permissions when any of its jobs uses a repository secret (`secrets.NAME`) or has a GITHUB_TOKEN that can write. Under pull_request_target and workflow_run the token can write unless `permissions` limits it to read access or none.
- Code from the pull request's head is every file the pull request can change, however the workflow gets it: a checkout of the pull request's head or merge ref, a checkout of `github.event.workflow_run.head_sha` or `head_branch` when the triggering run came from a pull request, `gh pr checkout`, or an artifact uploaded by a run that the pull request triggered.
- Installing its dependencies (`npm ci` runs the package's own scripts), building it, or running its tests, linter, scripts, Makefile or local actions executes it. Treating its files as data does not: listing changed files, posting a results file in a comment, uploading a coverage report, or deploying built static files.

A workflow that runs only on other events, such as `pull_request`, `push` or a schedule, has
nothing to check. Checking out the base or default branch, which is what `actions/checkout` does
without a `ref`, gets the repository's own code, not the pull request's.
