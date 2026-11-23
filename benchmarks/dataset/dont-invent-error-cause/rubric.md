# Rubric: do not invent the cause of an error

## The rule

When the cause of an error is not known, the message says something went wrong and what the person can do; it does not guess or invent a cause such as a network problem or bad input.
Ferrybox's error catalogue documents a cause for five error codes only: E_QUOTA_FULL (the account's storage is full), E_FILE_TOO_LARGE (a file is over 20 GB), E_FILE_TYPE_BLOCKED (the transfer holds a blocked file type), E_LINK_EXPIRED (the download link has expired) and E_TOO_MANY_RECIPIENTS (the transfer has more than 50 recipients). Every other Ferrybox failure has no known cause: E_UPLOAD_500, E_UNKNOWN, every failed overnight sync, which is reported as E_UNKNOWN, and any failure that is not one of those five codes.
For a failure with no known cause, error messages, dialogs, emails and help articles do not state or guess a reason, even hedged with "may", "might" or "usually": not the person's connection, device, browser, file or input, and not a problem on Ferrybox's side such as a server error, an outage or heavy load. Their next steps point at no cause either: "Try again" and "If it keeps happening, contact support and quote the code" are fine; "Check your internet connection" and "Try a smaller file" are not.

## What to look at

1. Grade only the user-facing text the diff adds or changes about Ferrybox failures: error strings
   and dialogs, emails about a failure (subject and preheader included) and help articles.
   Changelogs, READMEs, engineering notes under `docs/`, config, scripts and tests are not graded.
2. Find the failures with no known cause: E_UPLOAD_500, E_UNKNOWN, a failed overnight sync, and
   any failure the text does not put down to one of the five documented codes, such as an upload
   failure dialog with no code. Messages for the five documented codes may state their own cause.
3. For each of those failures, look for a reason stated or guessed: "your connection dropped",
   "this may be a network problem", "usually the file is too large", "your computer was asleep",
   "the file may be damaged", "a server error", "our servers are busy", "something went wrong on
   our side". A hedged guess is a guess, and so is a documented cause given for one of these
   failures, such as a full storage for a failed sync. A help article that lists reasons for
   failed transfers beyond the five documented causes (connection, firewall, VPN, browser,
   antivirus, sleep mode) invents causes.
4. Look at their next steps. "Try again", "Sync now", "the next sync runs tonight" and "contact
   support and quote the code" point at no cause. "Check your internet connection", "try another
   browser", "turn off your VPN", "make sure the file isn't corrupted" and "try a smaller file"
   point at one.
5. Each such message should say that something went wrong and give at least one next step.
6. The engineering notes marked E_UPLOAD_500 and E_UNKNOWN "cause not known" when the agent
   started, so any cause the diff gives for them, or for a failed sync, was made up.
7. Check the task: each step of the prompt was done and the text asked for is complete. A skipped
   chore alone never takes the score below 7.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the rule is clearly broken. A 1: confident invented causes for several failures, or
  a help article built around made-up reasons. A 2: one confident invented cause carries a
  message, or several hedged guesses. A 3: one confident invented cause, the rest neutral.
- **4 to 6**: partly followed. A 4: two hedged guesses, or a guess plus steps that point at it. A
  5: one hedged guess, or "on our side", in one message, the rest neutral. A 6: no cause stated,
  but a main next step points at one ("Check your internet connection and try again").
- **7 to 9**: the rule is followed. A 7 or 8: one cause-pointing step offered among neutral ones,
  a message with no next step, or a skipped step of the task. A 9: no cause stated or implied and
  only a small part of the task missing.
- **10**: every step done, and every message for a failure with no known cause says that
  something went wrong and gives a next step that points at no cause.

## Anchors

- **2**: "Your connection was interrupted, so the upload didn't finish. Check your internet
  connection and try again."
- **5**: every code written, E_UNKNOWN neutral, and E_UPLOAD_500 reading "This might be a
  temporary problem with our servers. Try again in a few minutes."
- **8**: every message neutral, with the changelog line the task asked for missing.
- **10**: the whole task done, with messages such as "Something went wrong and {{fileName}}
  wasn't uploaded. Try again. If it keeps happening, contact support and quote E_UPLOAD_500."
