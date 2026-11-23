# Larkspur Data hiring

The job adverts and hiring notes for Larkspur Data. Everything is plain Markdown, reviewed like
code, and published to the careers site from `main`.

## Layout

- `hiring/briefs/`: hiring managers' briefs for roles we are about to open, one per role.
- `hiring/adverts/`: the job adverts on the careers site, one per role, named after the role.
- `hiring/process.md`: the stages every candidate goes through, who runs each and how long it takes.
- `data/open-roles.json`: the open roles, read by the careers site.
- `scripts/check_adverts.py`: checks the adverts before they go live; its tests are in `tests/`.
- `CHANGELOG.md`: one line per change, newest first.

## Writing an advert

Every advert starts with a level-1 heading, the job title, followed by one line with the location,
the team and the salary. Then come these sections, in this order: `## About Larkspur Data`,
`## The role`, `## What you'll do`, `## What you bring`, `## What we offer` and `## How to apply`.
Keep lines to 100 characters.

## Checks

```sh
python3 scripts/check_adverts.py
python3 -m pytest
```

Questions go to #talent on Slack or to Niamh Gallagher, Talent Partner.
