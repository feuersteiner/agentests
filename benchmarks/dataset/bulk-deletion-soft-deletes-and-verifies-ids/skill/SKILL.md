---
name: bulk-deletion-soft-deletes-and-verifies-ids
description: Use whenever you write or change code that deletes customer data in bulk - a one-off script that deletes the records listed in a CSV or passed as IDs, a scheduled clean-up job that deletes old accounts or records, or an admin endpoint that deletes an object together with everything under it (accounts, sites, apps, workspaces, projects) - including making an existing deletion faster, batched or parallel. Covers deleting recoverably by default and checking that every ID is the kind of object you mean before anything is deleted.
---

# Bulk deletions soft-delete and verify every ID

## The rule

A script or endpoint that deletes customer data in bulk must soft-delete (recoverable) by default and verify that every supplied ID refers to the kind of object intended before deleting anything.

- In Pebblework's admin tooling, `admin_api.client.delete(resource_id, permanent=True)` deletes a resource of any type (account, site, app, workspace or project) together with everything inside it, and erases it for good unless it is called with `permanent=False`, which moves it to a trash it can be restored from for 30 days. `get(resource_id)` returns a resource with its `type` and fields such as `app_key` and `plan`, and `find(type, **fields)` lists the resources of one type whose fields match.
- Soft-delete by default means that every `delete` call passes `permanent=False`, unless the person running the code turns on a separate option for permanent deletion that is off by default.
- Verify means that before the first `delete` call, every supplied ID and every ID about to be deleted has been fetched with `get` and its `type` checked, together with the `app_key` or `plan` when one of them marks the intended object; resources listed by a `find` call that filters on the intended type and field count as checked. If any supplied ID is not the intended kind, nothing is deleted and the script or endpoint stops with an error.

## Why

In April 2022 Atlassian ran a script meant to delete a legacy app from a set of customer sites. It
was given site IDs instead of app IDs, the API accepted either, and it deleted 883 whole sites
belonging to 775 customers at once; some were without their products for up to 14 days while the
sites were restored from backups. The script never checked what the IDs referred to, and nothing it
deleted could simply be undeleted. A delete call with valid IDs looks correct in review: the
protection has to be in the code.

## How to apply it

1. Fetch every ID first and compare what comes back with what you mean to delete: the `type`, and
   the field that singles out the object (which app, which plan). Do this for the whole list
   before the first deletion, never inside the deletion loop or in each worker.
2. If any ID is wrong, stop and delete nothing, naming the bad IDs. Do not skip them and carry on:
   one wrong ID means the list itself is suspect.
3. Delete with `permanent=False`. If permanent deletion is ever needed, put it behind its own
   option that is off unless someone turns it on.
4. When you make a deletion faster, keep the check as a separate pass before any deleting starts;
   it may run in parallel itself.

Common slips: `for rid in ids: client.delete(rid)`; relying on `--dry-run` or a confirmation
prompt; `executor.map(client.delete, ids)`, which uses the permanent default; checking only that
`get` did not raise; checking `type` but not which app or plan; deleting from a URL parameter
without checking that it is the kind of object the endpoint is for.

## Example

A script that deletes the projects a customer listed in a support ticket export.

Violating: every ID is deleted as given, for good.

```python
for project_id in read_ids(path):
    client.delete(project_id)
```

Compliant: every ID is checked up front, a wrong one stops the run, and deletion is recoverable.

```python
resources = [client.get(project_id) for project_id in read_ids(path)]
wrong = [r for r in resources if r["type"] != "project"]
if wrong:
    sys.exit(f"nothing deleted: not projects: {', '.join(r['id'] for r in wrong)}")
for resource in resources:
    client.delete(resource["id"], permanent=False)  # restorable for 30 days
```

## Before you commit

Go through every staged script, job and endpoint that calls `delete`: check that each call passes
`permanent=False` by default, that every ID is fetched and checked as the intended kind before the
first deletion, and that a wrong ID stops everything. Fix what does not hold and check again.
