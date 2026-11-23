# How CI handles pull requests from forks

`ci.yml` runs on `pull_request`, so runs for forks get no secrets. The preview deploy runs in a
separate `workflow_run` workflow that downloads the built site. Nothing uses `pull_request_target`
to check out and build a fork's code.
