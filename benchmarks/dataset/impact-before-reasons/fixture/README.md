# fernway-comms

Customer messages for Fernway Mobile, a SIM-only mobile network in the UK: emails, in-app
notices, SMS and help-centre articles, with the script that checks them before they go out.

## Layout

- `docs/changes/`: internal memos about changes to plans and prices.
- `data/plans.json`: the plans, their prices and what they include.
- `data/schedule.yaml`: when each email, SMS and in-app notice goes out, and to whom.
- `emails/`: emails, in Markdown with front matter.
- `content/help/`: help-centre articles.
- `content/notices/`: in-app notices.
- `content/sms/`: SMS messages.
- `site/help-nav.yaml`: the sections and links of the help centre.
- `scripts/check_content.py`: checks the front matter and length of every message.
- `tests/`: the tests of the script.
- `CHANGELOG.md`: what changed in this repository.

## Development

Check the messages:

```sh
python3 scripts/check_content.py
```

Run the tests:

```sh
python3 -m pytest
```
