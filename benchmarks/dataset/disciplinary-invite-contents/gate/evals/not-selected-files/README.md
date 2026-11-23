# Fieldstone people documents

HR documents for Fieldstone Ltd, a business-energy broker in Leeds: our people policies, the case
files of open disciplinary cases, and the templates managers and HR use. Everything is plain
Markdown and is reviewed like code before anyone sends or publishes it.

## Layout

- `hr/policies/disciplinary.md`: the disciplinary procedure: investigation, hearing, companions,
  outcomes, gross misconduct and appeals.
- `hr/cases/<case>/`: one folder per open case, named by its case number, with the case's
  investigation report and letters.
- `hr/cases/2026-014/investigation.md`: the investigation report for case 2026-014.
- `hr/cases/2026-014/invite.md`: the hearing invitation for case 2026-014, in draft.
- `hr/templates/investigation-report.md`: the template for investigation reports.
- `data/cases.json`: the case register: each case's number, type, dates, status and who handles it.
- `scripts/check_docs.py`: checks the Markdown documents under `hr/`; its tests are in `tests/`.
- `CHANGELOG.md`: one line per change, newest first.

A closed case's folder is archived in the HR system and leaves this repository; the case stays in
the register.

## Checks

```sh
python3 scripts/check_docs.py
python3 -m pytest
```

Every document starts with a level-1 heading, and its relative links point to files that exist.

Questions go to Priya Shah, HR Business Partner, or to #people-team on Slack.
