# Overnight sync

Engineering notes on the overnight sync of the desktop app, a Pro feature, in beta. The customer
picks a folder in the desktop app. Every night at the hour set under Settings > Sync (02:00 by
default, `sync.defaultHour` in `app.config.json`), the app uploads what changed in that folder
since the last sync and updates the folder's share link, so people with the link always get the
latest files.

## When a sync fails

The scheduler only learns that the sync job stopped before it finished, and records E_UNKNOWN in
the sync history under Settings > Sync. The share link keeps the files of the last sync that
finished. The next sync runs the following night at the usual hour, and the customer can start one
at any time with Sync now under Settings > Sync.

We email the account owner when a sync fails, with the trigger `sync.failed`. The email is not
written yet.

Placeholders for the email: `{{firstName}}`, `{{folderName}}`, `{{failedAt}}` (the date and time
the sync stopped), `{{syncHour}}` (the hour of the nightly sync, such as 02:00) and
`{{historyUrl}}` (the sync history).
