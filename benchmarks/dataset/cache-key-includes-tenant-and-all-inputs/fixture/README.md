# tidewell-analytics

The reporting API behind Tidewell's analytics dashboards. Many organisations share one deployment:
each request carries a `RequestContext` with the caller's organisation, roles and locale, built by
the HTTP server from the session. It runs on [Bun](https://bun.sh) and has no dependencies.

## Layout

| Path                        | What it holds                                                            |
| --------------------------- | ------------------------------------------------------------------------ |
| `src/context.ts`            | `RequestContext` and the roles.                                          |
| `src/routes.ts`             | `handle(ctx, url)`, which answers the API's GET requests.                |
| `src/reports/service.ts`    | The saved reports and `runReport`.                                       |
| `src/reports/queries.ts`    | Fetching, masking and formatting report rows.                            |
| `src/search/service.ts`     | Full-text search over an organisation's documents.                       |
| `src/dashboards/render.ts`  | `renderDashboard`, which runs each widget's report.                      |
| `src/pipelines/runner.ts`   | The pipeline runner and the template pipelines.                          |
| `src/cache.ts`              | JSON get and set helpers over Redis (a `MemoryRedis` in the tests).      |
| `src/db.ts`                 | The warehouse tables (Postgres in production, in memory here).           |
| `test/`                     | The `bun test` suite.                                                    |

## Endpoints

| Request                            | Answer                                         |
| ---------------------------------- | ---------------------------------------------- |
| `GET /reports/:id?from=&to=&region=` | The report, run for the caller.              |
| `GET /search?q=`                   | The documents that contain every word of `q`. |
| `GET /dashboards/:id`              | The dashboard, with each widget's report.      |

## Reports

`runReport(ctx, reportId, params)` runs a saved report, `orders` or `revenue-by-region`, over the
caller's organisation's orders. `from` and `to` are dates, YYYY-MM-DD, and `region` narrows the
rows to one region. The margin column is shown only to finance and admins, customer emails only to
admins, and money and dates are formatted in the caller's locale. Every call queries the
warehouse.

## Pipelines

A pipeline is a list of steps, each with an `op` (`load`, `filter` or `sum`), its `args` and the
ids of the earlier steps it reads. `runPipeline(orgId, pipeline)` runs the steps in order for one
organisation and returns each step's output. Organisations install the template pipelines in
`templates`, and the scheduler runs every organisation's pipelines once an hour.

## Development

```sh
bun test
```

Notable changes go in `CHANGELOG.md`, under `Unreleased`.
