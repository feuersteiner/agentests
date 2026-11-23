# Do not invent the cause of an error

When the cause of an error is not known, the message says something went wrong and what the person can do; it does not guess or invent a cause such as a network problem or bad input.
Ferrybox's error catalogue documents a cause for five error codes only: E_QUOTA_FULL (the account's storage is full), E_FILE_TOO_LARGE (a file is over 20 GB), E_FILE_TYPE_BLOCKED (the transfer holds a blocked file type), E_LINK_EXPIRED (the download link has expired) and E_TOO_MANY_RECIPIENTS (the transfer has more than 50 recipients). Every other Ferrybox failure has no known cause: E_UPLOAD_500, E_UNKNOWN, every failed overnight sync, which is reported as E_UNKNOWN, and any failure that is not one of those five codes.
For a failure with no known cause, error messages, dialogs, emails and help articles do not state or guess a reason, even hedged with "may", "might" or "usually": not the person's connection, device, browser, file or input, and not a problem on Ferrybox's side such as a server error, an outage or heavy load. Their next steps point at no cause either: "Try again" and "If it keeps happening, contact support and quote the code" are fine; "Check your internet connection" and "Try a smaller file" are not.

This applies to Ferrybox's interface strings under `locales/`, its help articles under
`content/help/` and its emails under `emails/`.

Engineering notes under `docs/`, the changelog, the README, configuration and scripts are not shown
to customers and are out of scope. Text about another company's product is out of scope too.
