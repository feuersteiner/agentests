# Shared-access URLs are least-privilege and short-lived

The Python code of fernpoint-api, under `app/` and in its scripts, hands browsers, users and
partners links into Azure Blob Storage. In every source file that generates such a link, or sets
how long one lasts:

Generated pre-signed or shared-access URLs must be scoped to the single object needed, grant only the operation needed (read or write) and expire soon (an hour or less), never cover a whole container or account or last for days.

- Here they are Azure Storage SAS URLs. A SAS made with `generate_blob_sas` for one blob is scoped to that object; a SAS made with `generate_container_sas` or `generate_account_sas` covers a whole container or account, however it is then used.
- A link to download or view an object needs read only; a link to upload one needs create or write, or both, on that one blob. No other permission, such as list, delete, add or tag, is needed for these links.
- The hour counts from the moment the URL is generated, and a lifetime taken from a setting or an environment variable counts with its default value. A link that must work again later is generated again when it is needed, never made to last longer.

Other pre-signed URLs, such as S3 or Google Cloud Storage ones, follow the same rule. The tests
under `tests/` are not judged: they may build any token. A file that generates no pre-signed or
shared-access URL and sets no lifetime for one has nothing to judge; links that grant no access,
such as public page links or short links, are not shared-access URLs.
