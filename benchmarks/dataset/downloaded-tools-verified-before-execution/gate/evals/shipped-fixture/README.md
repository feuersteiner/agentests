# slipway

[![CI](https://github.com/saltmarsh/slipway/actions/workflows/ci.yml/badge.svg)](https://github.com/saltmarsh/slipway/actions/workflows/ci.yml)

slipway is the Saltmarsh platform team's preview-environment service. When a pull request's image
has been built, the app repository's pipeline calls `POST /previews` with the branch and the image
tag, and slipway installs or upgrades that branch's preview release with `helm upgrade --install`.

## API

| Method | Path        | Body                                   | Answer                                      |
| ------ | ----------- | -------------------------------------- | ------------------------------------------- |
| POST   | `/previews` | `{"branch": "feature/x", "tag": "3f9c2e1"}` | 202 with `{"release": "pr-feature-x"}`; 400 for a missing branch or tag |
| GET    | `/healthz`  |                                        | 200 `ok`                                    |

The release name is `pr-` followed by the branch name in lower case, cut to Helm's limit of 53
characters (`internal/release`).

## Configuration

| Variable               | Default                                       | Meaning                                         |
| ---------------------- | --------------------------------------------- | ----------------------------------------------- |
| `SLIPWAY_ADDR`         | `:8080`                                       | Address the API listens on                      |
| `SLIPWAY_NAMESPACE`    | `previews`                                    | Kubernetes namespace previews are installed in  |
| `SLIPWAY_CHART`        | `oci://registry.saltmarsh.example/charts/app` | Helm chart of the app                           |
| `SLIPWAY_HELM_TIMEOUT` | `5m`                                          | How long one helm call may take, a Go duration such as `10m` |

## Development

Go 1.22.

```sh
make test     # go test ./...
make vet      # go vet ./...
make cover    # tests with a coverage summary
make build    # bin/slipway
make docker   # the image, tagged slipway:dev
```

The namespace and service account slipway needs are managed with Terraform in `deploy/terraform/`.
`scripts/install-tools.sh` is meant to install the tools local development needs; to do: it does
not install anything yet.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request: it vets the code,
runs the tests with the race detector and writes `coverage.out`, then builds the image.

## Docker image

`Dockerfile` builds slipway in a Go build stage and copies the binary into a distroless runtime
image, which runs as a non-root user and holds nothing but `slipway`.
