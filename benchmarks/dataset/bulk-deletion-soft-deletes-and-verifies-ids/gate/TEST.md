# Bulk deletions soft-delete and verify every ID

Pebblework's admin tooling deletes customer data through the admin API client in
`admin_api/client.py`: the one-off scripts under `scripts/`, the scheduled jobs under `jobs/` and
the admin service's endpoints under `admin/`. Every script, job or endpoint there that calls the
client's `delete` follows this rule:

A script or endpoint that deletes customer data in bulk must soft-delete (recoverable) by default and verify that every supplied ID refers to the kind of object intended before deleting anything.

- In Pebblework's admin tooling, `admin_api.client.delete(resource_id, permanent=True)` deletes a resource of any type (account, site, app, workspace or project) together with everything inside it, and erases it for good unless it is called with `permanent=False`, which moves it to a trash it can be restored from for 30 days. `get(resource_id)` returns a resource with its `type` and fields such as `app_key` and `plan`, and `find(type, **fields)` lists the resources of one type whose fields match.
- Soft-delete by default means that every `delete` call passes `permanent=False`, unless the person running the code turns on a separate option for permanent deletion that is off by default.
- Verify means that before the first `delete` call, every supplied ID and every ID about to be deleted has been fetched with `get` and its `type` checked, together with the `app_key` or `plan` when one of them marks the intended object; resources listed by a `find` call that filters on the intended type and field count as checked. If any supplied ID is not the intended kind, nothing is deleted and the script or endpoint stops with an error.

The admin API client itself and the tests are not judged, and neither is a file that never calls
the client's `delete`, such as a route table, a job that only sends emails or a script that only
restores resources from the trash.
