---
name: dont-invent-error-cause
description: Covers what Ferrybox's user-facing text says about why something failed. Use whenever writing or editing error strings or dialogs in locales/*.json, an email that tells a customer a transfer, upload or sync failed, or a help article about failed transfers, especially for an error code whose cause is not documented, even if the request only asks for helpful or friendly wording.
---

# Do not invent the cause of an error

When the cause of an error is not known, the message says something went wrong and what the person can do; it does not guess or invent a cause such as a network problem or bad input.
Ferrybox's error catalogue documents a cause for five error codes only: E_QUOTA_FULL (the account's storage is full), E_FILE_TOO_LARGE (a file is over 20 GB), E_FILE_TYPE_BLOCKED (the transfer holds a blocked file type), E_LINK_EXPIRED (the download link has expired) and E_TOO_MANY_RECIPIENTS (the transfer has more than 50 recipients). Every other Ferrybox failure has no known cause: E_UPLOAD_500, E_UNKNOWN, every failed overnight sync, which is reported as E_UNKNOWN, and any failure that is not one of those five codes.
For a failure with no known cause, error messages, dialogs, emails and help articles do not state or guess a reason, even hedged with "may", "might" or "usually": not the person's connection, device, browser, file or input, and not a problem on Ferrybox's side such as a server error, an outage or heavy load. Their next steps point at no cause either: "Try again" and "If it keeps happening, contact support and quote the code" are fine; "Check your internet connection" and "Try a smaller file" are not.

Apply this to every error string, failure dialog, failure email and help article you write or
change, for the whole task, and check it again before you commit.

## Why

- A made-up cause sends the person off to fix the wrong thing: they restart their router or shrink
  a file that was never the problem, then contact support anyway, annoyed.
- A specific-sounding reason feels more helpful than "Something went wrong", so it is tempting to
  fill the gap with a plausible one. When engineering does not know the cause, nobody does.
- A next step can claim a cause without saying so: "Check your connection" tells the reader the
  connection is the likely problem.

## How to write one

1. Look the failure up in the catalogue above. If it is one of the five documented codes, say its
   cause and its fix.
2. Otherwise, say plainly that something went wrong and what did not happen ("the upload didn't
   finish", "last night's sync didn't finish").
3. Give next steps that point at no cause: try again, start it again, wait for the next scheduled
   run, contact support and quote the code.
4. Leave out "may", "might", "probably", "usually" and "this can happen when" for these failures.

## Gotchas

- "Your connection was interrupted", "a network issue", "a slow or unstable connection"
- "Our servers are busy", "a temporary problem on our side", "a server error occurred"
- "The file may be too large or damaged", "your computer may have been asleep or offline"
- Steps such as "check your internet connection", "try another browser", "turn off your VPN",
  "make sure the file isn't corrupted" or "try a smaller file"
- A help article that pads its list of reasons with common causes the catalogue does not document

## Example

From an export feature whose error EXPORT_FAILED has no documented cause.

Compliant:

```json
{
  "EXPORT_FAILED": "Something went wrong and your export didn't finish. Try again. If it keeps happening, contact support and quote EXPORT_FAILED."
}
```

Violating:

```json
{
  "EXPORT_FAILED": "The export timed out, probably because of a slow connection or a very large folder. Check your network and try exporting fewer files."
}
```

## Before you commit

Reread every error string, failure dialog, failure email and help article you created or changed.
For each failure with no documented cause, ask: does any sentence or next step tell the reader why
it happened? If so, remove the reason and keep "something went wrong" with a neutral next step.
