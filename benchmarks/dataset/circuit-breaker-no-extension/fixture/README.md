# Fieldstone product planning

Fieldstone makes booking software for independent fitness studios. This repository holds the
product team's planning: cycle plans, status reports, betting table notes, retrospectives and
pitches, with a small script for cycle dates, pitches and teams.

## Layout

- `cycles/process.md`: how we plan and run cycles.
- `cycles/cycle-12-status.md`: the status report at the end of cycle 12.
- `cycles/pitches/`: the pitches for the next betting table.
- `templates/`: the templates for cycle plans, betting table notes and retrospectives.
- `data/team.json`: the build teams and the betting table.
- `scripts/cycles.py`: cycle dates, a list of pitches and team lookups.
- `tests/test_cycles.py`: the tests of `scripts/cycles.py`.
- `CHANGELOG.md`: what changed in this repository, by month.

## Usage

```sh
python3 scripts/cycles.py dates 13    # start, end and cool-down of cycle 13
python3 scripts/cycles.py pitches     # each pitch in cycles/pitches/ with its appetite
```

Run the tests with `python3 -m pytest`.
