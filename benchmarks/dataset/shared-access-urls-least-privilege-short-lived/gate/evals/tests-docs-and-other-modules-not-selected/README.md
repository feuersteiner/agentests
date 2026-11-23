# fernpoint-api

The web API behind Fernpoint, a dashboards and reporting app for small finance teams. Users build
reports, export them to CSV and attach files to projects. The data team trains Fernpoint's
forecasting models on a monthly training dataset and manages it with a small admin CLI.

Files live in Azure Blob Storage, in one storage account set by `FERNPOINT_STORAGE_ACCOUNT` and
`FERNPOINT_STORAGE_KEY`:

| Container     | Blob names                    | What they are                          |
| ------------- | ----------------------------- | -------------------------------------- |
| `exports`     | `<user id>/<report id>.csv`   | Exported reports, written by a worker  |
| `avatars`     | `<user id>`                   | Profile pictures                       |
| `attachments` | `<project id>/<file name>`    | Files attached to projects             |
| `datasets`    | `training/<yyyy-mm>.parquet`  | The data team's monthly training sets  |

## Layout

- `app/config.py`: settings, read from the environment.
- `app/storage.py`: the Blob Storage client, the container names and the links handed to browsers.
- `app/store.py`: in-memory records of project members and exports.
- `app/web.py`: the router; the gateway in front of it signs users in and sets `user_id`.
- `app/routes/`: the endpoints, one module per area.
- `app/cli.py`: admin commands for the data team.
- `tests/`: the pytest suite. `tests/fake_azure.py` stands in for the Azure SDK, so the tests run
  offline.

## API

| Method | Path                           | What it does                                          |
| ------ | ------------------------------ | ----------------------------------------------------- |
| POST   | `/exports`                     | Queues an export of the report in `report_id`         |
| GET    | `/exports`                     | Lists the user's exports and their status             |
| PUT    | `/me/avatar`                   | Replaces the user's avatar with the image in the body |
| GET    | `/users/<user_id>/avatar`      | Returns a user's avatar image                         |
| GET    | `/projects/<project_id>/files` | Lists a project's files, each with a download link    |

## Avatars

The browser sends the image to `PUT /me/avatar` with its `Content-Type`. PNG and JPEG images of up
to 2 MB are accepted and stored as the user's blob in `avatars`; anything else is refused.

## CLI

```sh
python3 -m app.cli datasets                          # every blob in datasets, with its size
python3 -m app.cli upload-dataset <file> <yyyy-mm>   # store a month's training set
```

The newest month under `training/` is the current training dataset.

## Tests

```sh
python3 -m pytest
```

## Sharing

Partners get a SAS link to the whole `datasets` container, valid for 30 days.
