---
name: shared-access-urls-least-privilege-short-lived
description: Use whenever you write or change code that generates a link into blob or object storage - Azure SAS tokens (generate_blob_sas, generate_container_sas, generate_account_sas, BlobSasPermissions), S3 or GCS pre-signed URLs - such as download links, browser upload URLs, links shared with customers, vendors or other teams, and the expiry or TTL settings of such links, even if the request does not mention security. Covers what a generated link may reach, what it may do and how long it may last.
---

# Shared-access URLs are least-privilege and short-lived

## The rule

Generated pre-signed or shared-access URLs must be scoped to the single object needed, grant only the operation needed (read or write) and expire soon (an hour or less), never cover a whole container or account or last for days.

- Here they are Azure Storage SAS URLs. A SAS made with `generate_blob_sas` for one blob is scoped to that object; a SAS made with `generate_container_sas` or `generate_account_sas` covers a whole container or account, however it is then used.
- A link to download or view an object needs read only; a link to upload one needs create or write, or both, on that one blob. No other permission, such as list, delete, add or tag, is needed for these links.
- The hour counts from the moment the URL is generated, and a lifetime taken from a setting or an environment variable counts with its default value. A link that must work again later is generated again when it is needed, never made to last longer.

## Why

A SAS URL is a bearer credential: whoever holds the string can use it, with no sign-in, until it
expires, and it cannot be revoked short of rotating the account key. Links get pasted into
tickets, chat, emails and public repositories. Microsoft exposed internal backups and Teams
messages this way: a storage URL shared in a public GitHub repository carried an overly permissive
token with a far-off expiry. A link for one blob, one operation and a few minutes limits what a
leak can do.

## How to apply it

1. Sign the one blob the caller needs, with `generate_blob_sas` and its full name. Never sign a
   container or the account to save a call per file.
2. Pick the single operation: `BlobSasPermissions(read=True)` for a download,
   `BlobSasPermissions(create=True, write=True)` for an upload to that blob.
3. Set `expiry=datetime.now(timezone.utc) + timedelta(minutes=...)`, 60 at most. A start a few
   minutes in the past for clock skew is fine.
4. When links expire before people use them, issue them later, not longer: hand out a link to your
   own endpoint, which checks access and redirects to a fresh short SAS, or a command that prints a
   fresh one when someone needs it.

Slips to watch for: `generate_container_sas` "so they can fetch everything"; `list=True` or
`delete=True` added "just in case"; `permission="racwdl"`; `timedelta(days=7)` "so links don't
expire"; `int(os.environ.get("LINK_TTL_HOURS", "24"))`.

## Example

A support tool gives an agent a link to a customer's uploaded log file.

Violating: the whole container, read and list, for a week.

```python
sas = generate_container_sas(
    ACCOUNT, "support-logs", account_key=KEY,
    permission=ContainerSasPermissions(read=True, list=True),
    expiry=datetime.now(timezone.utc) + timedelta(days=7),
)
return f"{ACCOUNT_URL}/support-logs/{ticket_id}/app.log?{sas}"
```

Compliant: the one log file, read only, for 15 minutes, generated each time it is opened.

```python
name = f"{ticket_id}/app.log"
sas = generate_blob_sas(
    ACCOUNT, "support-logs", name, account_key=KEY,
    permission=BlobSasPermissions(read=True),
    expiry=datetime.now(timezone.utc) + timedelta(minutes=15),
)
return f"{ACCOUNT_URL}/support-logs/{name}?{sas}"
```

## Before you commit

For every SAS or pre-signed URL the diff generates or changes, including in scripts and CLI
commands, check three things: it names one blob, it grants only read or only create/write, and
its expiry, traced through constants, settings and environment defaults, is an hour or less from
now. Fix what fails and check again.
