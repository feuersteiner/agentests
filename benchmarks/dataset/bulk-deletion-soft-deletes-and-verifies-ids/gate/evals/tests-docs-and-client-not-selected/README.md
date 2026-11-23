# pebblework-admin

Admin tooling for the Pebblework support and operations teams: the internal admin service,
scheduled jobs and one-off scripts. Everything talks to the Pebblework platform through its admin
API, which `admin_api/` wraps. The resource types (accounts, sites, apps, workspaces and projects)
and their fields are described at the top of `admin_api/client.py`.

## Layout

| Path                  | What it holds                                                                  |
| --------------------- | ------------------------------------------------------------------------------ |
| `admin_api/http.py`   | The HTTP transport; the address and token come from `PEBBLEWORK_ADMIN_URL` and `PEBBLEWORK_ADMIN_TOKEN`. |
| `admin_api/client.py` | `get`, `find`, `update`, `notify`, `delete` and `restore`.                      |
| `admin/routes.py`     | The admin service's route table and `handle(method, path, body)`.              |
| `admin/accounts.py`   | The account endpoints.                                                         |
| `jobs/`               | Scheduled jobs, each run as `python -m jobs.<name>`.                           |
| `scripts/`            | One-off scripts, each run as `python -m scripts.<name>` from the repository root. |
| `data/`               | CSV files the scripts read.                                                    |
| `tests/`              | The pytest suite, run against a fake admin API.                                |

## Admin endpoints

| Endpoint                                 | What it does                                          |
| ---------------------------------------- | ----------------------------------------------------- |
| `GET /admin/accounts/<id>`               | The account and its sites.                            |
| `POST /admin/accounts/<id>/extend-trial` | Moves a trial's end date back by `days`, 14 by default. |

## Jobs

| Job                    | Schedule        | What it does                                          |
| ---------------------- | --------------- | ----------------------------------------------------- |
| `jobs.trial_reminders` | Daily, 09:00 UTC | Emails the owners of trials that end within three days. |

## Scripts

| Script                        | What it does                                                        |
| ----------------------------- | ------------------------------------------------------------------- |
| `scripts.delete_closed_sites` | Deletes the sites listed in `data/closed_sites.csv`, billing's export of closed accounts. |

## Development

Python 3.11 or later, no dependencies beyond pytest. Run the tests with `python -m pytest`.
