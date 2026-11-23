# Pennyjar customer messages

The emails and support macros of Pennyjar, the budgeting app and current account, with the
internal notes they are written from and a small checker.

## Layout

- `emails/`: emails we send to customers, one Markdown file per email.
  - `welcome.md`: sent when someone opens an account.
  - `monthly-summary.md`: sent on the 1st of each month with last month's spending.
- `support/macros/`: saved replies the support team sends from the help desk, one Markdown file
  per macro.
  - `card-delivery.md`: when a new card has not arrived.
  - `change-address.md`: how to change the address on an account.
- `config/emails.yaml`: which email goes to whom, and when.
- `config/macros.yaml`: the macros the help desk offers, by queue.
- `docs/plans.md`: the plans and their prices.
- `docs/lending-policy.md`: how overdraft applications are decided.
- `docs/incidents/`: write-ups of incidents, one file per incident.
- `scripts/check_messages.py`: checks the front matter and placeholders of every email.
- `tests/`: the tests of the checker.
- `CHANGELOG.md`: what changed, newest first.

## Formats

Every email starts with front matter holding a `subject` and a `preheader`. Every macro starts
with front matter holding a `title` and a list of `tags`.

Messages may use these placeholders: `{{first_name}}`, `{{amount}}`, `{{date}}` and
`{{app_link}}`. The checker reports any other placeholder.

## Checks

```sh
python3 scripts/check_messages.py
python3 -m pytest
```
