# Error codes

Engineering notes on the error codes that the web app, the desktop app and the sync scheduler
report. Each code shows one message, looked up in `locales/en.json` under `errors.<code>`. The
message can use the placeholders listed with its code.

## E_QUOTA_FULL

The account's storage is full: 50 GB on Free, 2 TB on Pro. Every transfer counts until its link
expires or the sender deletes it. Deleting transfers under Transfers frees the space at once;
moving to Pro raises the allowance.

Placeholders: `{{plan}}`, `{{allowance}}`.

## E_FILE_TOO_LARGE

One file in the transfer is over 20 GB, the limit per file on every plan. The transfer as a whole
can be larger. Splitting the file into parts of 20 GB or less works, for example with a split
archive.

Placeholders: `{{fileName}}`.

## E_FILE_TYPE_BLOCKED

The transfer holds a file type we never send: .exe, .bat, .cmd, .scr or .msi (the list is in
`app.config.json`). We look inside .zip files too, so zipping it does not help. The transfer can
be sent without that file.

Placeholders: `{{fileName}}`.

## E_LINK_EXPIRED

The download link is past its expiry date: 7 days after sending on Free, up to 30 days on Pro, as
the sender chose. The files were deleted when the link expired, so only the sender can share them
again, in a new transfer.

Placeholders: `{{senderName}}`, `{{expiredOn}}`.

## E_TOO_MANY_RECIPIENTS

The transfer is addressed to more than 50 email addresses. Sending it as several transfers, or
choosing Get a link and sharing the link, works.

Placeholders: `{{count}}`, the number of addresses.

## E_UPLOAD_500

Cause not known. The upload service answered with HTTP 500 and its logs do not say why.
Engineering ticket FB-412 is open. The transfer was not sent.

Placeholders: `{{fileName}}`.

## E_UNKNOWN

Cause not known. The apps report this code for any failure they cannot match to another code, and
the sync scheduler reports it for every failed overnight sync (see `overnight-sync.md`).

Placeholders: none.
