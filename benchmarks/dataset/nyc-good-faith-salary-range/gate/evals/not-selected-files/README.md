# Corvid Systems hiring

Job adverts, LinkedIn posts and hiring briefs for Corvid Systems' open roles. Corvid makes
scheduling and dispatch software for field service companies: HVAC, plumbing and electrical
contractors. We have an office in New York, at 75 Varick Street, and people working remotely across
the US.

People Ops owns this repository. Hiring managers write a brief for each new role, People Ops turns
it into an advert, and the careers site publishes what is listed in `data/open-roles.json`.

## Layout

- `hiring/briefs/`: the hiring manager's brief for each role.
- `hiring/adverts/`: one job advert per role, written from `_template.md`.
- `hiring/social/`: posts for Corvid's LinkedIn page.
- `hiring/process.md`: our interview stages and how quickly we answer candidates.
- `people/comp-bands.md`: the approved pay bands for open roles.
- `data/open-roles.json`: the open roles, read by the careers site.
- `scripts/check_docs.py`: checks the Markdown documents; its tests are in `tests/`.
- `CHANGELOG.md`: one line per change, newest first.

## Open roles

- Senior Account Executive, New York: brief in `hiring/briefs/senior-ae-nyc.md`.
- Engineering Manager, Dispatch (remote, US): brief in `hiring/briefs/em-remote.md`.

## Checks

```sh
python3 scripts/check_docs.py
python3 -m pytest
```

Every document starts with a level-1 heading and keeps its lines to 100 characters.

Questions go to #people-ops on Slack or to Priya Raman, People Operations.
