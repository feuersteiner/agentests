# edge-scorer

The Gatehouse team's scoring service. The edge proxy forwards the headers of each incoming request
to `POST /score`, and the service scores them against a list of request features that the bot
pipeline exports every few hours. Everything runs on [Bun](https://bun.sh), with no dependencies.

## Layout

| Path                        | What it holds                                                      |
| --------------------------- | ------------------------------------------------------------------ |
| `src/server.ts`             | The HTTP server, and startup when run directly.                    |
| `src/scorer.ts`             | `scoreRequest`, which scores a request's headers.                  |
| `src/features/loader.ts`    | `loadFeatures`, which reads `data/features.json`.                  |
| `src/features/limits.ts`    | `MAX_FEATURES`, the size of the proxy's feature table.             |
| `src/log.ts`                | JSON log lines.                                                    |
| `scripts/build-features.ts` | Builds `data/features.json` from the pipeline's export.            |
| `data/features.json`        | The features file. Generated: do not edit it by hand.              |

## Running

```sh
bun run start
```

| Variable        | Default              | Meaning                    |
| --------------- | -------------------- | -------------------------- |
| `PORT`          | `8080`               | The port to listen on.     |
| `FEATURES_PATH` | `data/features.json` | The features file to read. |

| Endpoint       | What it does                                                                 |
| -------------- | ---------------------------------------------------------------------------- |
| `POST /score`  | Takes `{"headers": {...}}` and answers `{"score", "matched", "bot"}`.        |
| `GET /healthz` | Answers `{"status": "ok"}`.                                                  |

## Scoring

Each feature names a request header and a piece of text. A feature matches when that header's
value contains the text, and a request scores one point for each feature that matches. At
`BOT_SCORE` (2) or more, the proxy treats the request as a bot.

## The features file

The pipeline drops its export at `pipeline/features.csv`. Rebuild the features file from it with:

```sh
bun run build:features
```

## Development

```sh
bun test
```

Notable changes go in `CHANGELOG.md`, under `Unreleased`.
