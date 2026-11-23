# Tessellate hiring

Hiring documents for Tessellate's Amsterdam office: how we run a hiring process, and the forms,
scripts and guides that recruiters and interviewers use. Everything is plain Markdown and is
reviewed like code before it goes live.

## Layout

- `hiring/process.md`: the five stages of a hiring process, who runs each and how long it takes.
- `hiring/application-form.md`: the questions on the careers-site application form, for every role.
- `hiring/roles/`: one description per open role, with its level, team and salary band.
- `hiring/screening/`: scripts for recruiter phone screens, one per role.
- `hiring/interview-guides/`: guides for interviewers, one per role and round.
- `data/open-roles.json`: the open roles, read by the careers site.
- `scripts/check_docs.py`: checks the hiring documents; its tests are in `tests/`.
- `CHANGELOG.md`: one line per change, newest first.

Name new documents after the role and the stage, and put them in the folder for their kind.

## Checks

```sh
python3 scripts/check_docs.py
python3 -m pytest
```

Every document starts with a level-1 heading and keeps its lines to 100 characters.

Questions go to #people-ops on Slack or to Sanne de Wit, Talent Acquisition.
