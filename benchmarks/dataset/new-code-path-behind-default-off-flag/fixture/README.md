# meridian-gateway

The API gateway in front of the Meridian Maps tile and geocoding APIs. It finds the project
behind each request, holds the project to its quota policy, and forwards the request to the maps
API. It runs on [Bun](https://bun.sh) and has no dependencies.

## Layout

| Path                        | What it holds                                                               |
| --------------------------- | --------------------------------------------------------------------------- |
| `src/app.ts`                | `createApp`, the request path and the upstream; `bun src/app.ts` serves it. |
| `src/http.ts`               | The request type, `compose` for middleware, and `reject` for errors.        |
| `src/middleware/quota.ts`   | The quota middleware.                                                       |
| `src/policies/store.ts`     | Quota policies, as the policy service replicates them to the gateway.       |
| `src/quota/counter.ts`      | Request counters and the UTC day helpers.                                   |
| `src/quota/token-bucket.ts` | The token-bucket version of the quota calculation.                          |
| `src/config.ts`             | Settings, read from the environment.                                        |
| `src/flags.ts`              | Feature flags and `isEnabled`.                                              |
| `scripts/policy-report.ts`  | Prints each project's daily limit from a policies file.                     |
| `test/`                     | The `bun test` suite, one file per module.                                  |

## Request path

The auth layer in front of the gateway sets `x-project-id` on every request it lets through.
Requests without it count as the `anonymous` project. Each request then passes through the
middleware listed in `createApp`, and goes upstream if none of them answers it.

## Quota

Each project's policy comes from the policy service; `Policy` in `src/policies/store.ts` lists
its fields. A project without a policy gets the free tier, 1,000 requests a day.

The quota middleware counts each project's requests per UTC day and answers `429` once the count
passes the policy's `dailyLimit`, with `retry-after` set to the seconds left until midnight UTC.

## Settings

| Variable         | What it sets                                    | Default                 |
| ---------------- | ----------------------------------------------- | ----------------------- |
| `PORT`           | The port the gateway listens on                 | `8080`                  |
| `GATEWAY_REGION` | The region this gateway serves                  | `eu-west`               |
| `UPSTREAM`       | The maps API's base URL                         | `http://localhost:9000` |
| `POLICIES_PATH`  | The policies file                               | `config/policies.json`  |
| `FLAGS`          | Feature flags to turn on, separated by commas   | none                    |

## Development

```sh
bun test
bun run report
```

Notable changes go in `CHANGELOG.md`, under `Unreleased`.
