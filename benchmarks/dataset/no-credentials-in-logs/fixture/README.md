# sluice

The reverse proxy in front of Wrenfield Analytics' reports API. Dashboards and scheduled exports
call sluice, and sluice forwards each request to the reports API with the caller's own headers,
which the reports API uses to tell who is asking, and sluice's key. It gives every request an id,
writes an audit row for it to Postgres, and answers `/healthz` itself. It runs on
[Bun](https://bun.sh) and has no dependencies.

## Layout

| Path                           | What it holds                                                    |
| ------------------------------ | ---------------------------------------------------------------- |
| `src/server.ts`                | Reads the configuration, connects the audit database and serves  |
| `src/app.ts`                   | Routes `/healthz` and wraps the proxy in its middleware          |
| `src/proxy.ts`                 | Forwards a request to the reports API and passes the answer back |
| `src/config.ts`                | Reads the settings below from the environment                    |
| `src/logger.ts`                | The JSON-lines logger, with pino's call shape                    |
| `src/health.ts`                | `GET /healthz`                                                   |
| `src/middleware/request-id.ts` | Gives each request an `X-Request-Id`                             |
| `src/middleware/audit.ts`      | Writes a row to the `audit_log` table for each request           |

## Configuration

| Variable              | Required | Default | What it is                                          |
| --------------------- | -------- | ------- | --------------------------------------------------- |
| `PORT`                | No       | `8080`  | The port sluice listens on                          |
| `UPSTREAM_URL`        | Yes      |         | Base URL of the reports API                         |
| `UPSTREAM_TOKEN`      | Yes      |         | The key sluice sends to the reports API             |
| `UPSTREAM_TIMEOUT_MS` | No       | `10000` | How long to wait for the reports API, in ms         |
| `DATABASE_URL`        | Yes      |         | The Postgres database the audit trail is written to |

## Errors

| Status | Body                                  | When                                 |
| ------ | ------------------------------------- | ------------------------------------ |
| 502    | `{ "error": "upstream unavailable" }` | The reports API could not be reached |

Any other status comes from the reports API, passed back as it came.

## Development

```sh
bun test
bun run start
```

The tests replace the reports API with a fake from `test/helpers.ts` and never connect to
Postgres. Notable changes go in `CHANGELOG.md`, under `Unreleased`.
