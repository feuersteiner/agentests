# fennel-edge

The Cloudflare Workers in front of Fennel Prints' photo uploads and card payments, and the ops
scripts we run against them.

- `src/` is the R2 gateway Worker, `r2-gateway`. Customers upload the photos of a print order to
  it; it stores them in our R2 bucket with an R2 access key, records each upload in Postgres, and
  sends completed orders to the print lab's API.
- `payments/` is the payments Worker, `payments`, which takes card payments through Tillpoint.
- `ops/` holds the scripts we run by hand; `ops/lib.sh` has their shared helpers.
- `test/` holds the unit tests.

## Environments

Each Worker has two environments in its `wrangler.toml`: the top-level settings are development
(`r2-gateway-dev`, `payments-dev`) and `[env.production]` is production (`r2-gateway`,
`payments`). Deploy from the Worker's folder with `wrangler deploy --env production`.

## Secrets

| Worker       | Secret                                 | What it is                                                      |
| ------------ | -------------------------------------- | --------------------------------------------------------------- |
| `r2-gateway` | `STORAGE_KEY_ID`, `STORAGE_KEY_SECRET` | the R2 access key for the uploads bucket                        |
| `r2-gateway` | `DATABASE_URL`                         | `postgres://<login>:<password>@db.fennelprints.example/uploads` |
| `r2-gateway` | `LAB_API_TOKEN`                        | the print lab API token                                         |
| `payments`   | `TILLPOINT_API_KEY`                    | the Tillpoint API key                                           |

The ops scripts need `wrangler`, `curl`, `jq` and `psql`, and these variables: `CF_ACCOUNT_ID`,
`CLOUDFLARE_API_TOKEN`, `LAB_ADMIN_TOKEN`, `TILLPOINT_ADMIN_KEY` and `DB_ADMIN_URL`. The same names
are set as repository secrets on GitHub.

## Ops scripts

| Script                      | What it does                                          |
| --------------------------- | ----------------------------------------------------- |
| `ops/rotate_lab_token.sh`   | Replaces the print lab API token of `r2-gateway`.     |
| `ops/rotate_storage_key.sh` | Replaces the R2 access key of `r2-gateway`.           |

## Development

Node 22. `npm test` runs the unit tests; nothing needs installing.
