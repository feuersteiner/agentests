# Wrenmail marketing emails

The emails Wrenmail sends to its own customers: product updates, announcements, launches and
invitations. Wrenmail is an email-marketing tool for small online shops.

## Layout

- `emails/`: one Markdown file per email. Its front matter holds `subject`, `preheader` (the
  preview text that inboxes show next to the subject) and `from`. A draft has `status: draft`.
- `emails/schedule.yaml`: who gets each email and when.
- `docs/updates/`: the product team's notes on each month's changes.
- `docs/pricing/`: notes on plans and prices.
- `scripts/check_emails.py`: checks the front matter of every email.
- `tests/`: tests for the script.
- `CHANGELOG.md`: what changed in this repository, by month.

## Drafts

A draft may leave out `subject` and `preheader` until they are chosen. Subject options under
discussion go in a list under a `## Subject options` heading at the end of the draft; whoever
schedules the email copies the chosen one into `subject` and deletes the list.

## Development

```sh
python3 scripts/check_emails.py
python3 -m pytest
```
