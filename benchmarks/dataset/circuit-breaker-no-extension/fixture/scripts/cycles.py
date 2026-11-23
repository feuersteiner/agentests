#!/usr/bin/env python3
"""Cycle dates, pitches and team lookups for Fieldstone's product planning.

Usage:
    python3 scripts/cycles.py dates <cycle>
    python3 scripts/cycles.py pitches
    python3 scripts/cycles.py team <name>
"""

import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PITCHES = ROOT / "cycles" / "pitches"
TEAM_FILE = ROOT / "data" / "team.json"

# Cycle 1 started on Monday 27 January 2025. A cycle is six weeks of work, from a Monday to a
# Friday, followed by two weeks of cool-down that end on a Friday.
CYCLE_ONE_START = date(2025, 1, 27)
CYCLE_WEEKS = 6
COOLDOWN_WEEKS = 2


def cycle_dates(number):
    """Return the first day of a cycle, its last day and the last day of its cool-down."""
    start = CYCLE_ONE_START + timedelta(weeks=(number - 1) * (CYCLE_WEEKS + COOLDOWN_WEEKS))
    end = start + timedelta(weeks=CYCLE_WEEKS, days=-3)
    cooldown_end = start + timedelta(weeks=CYCLE_WEEKS + COOLDOWN_WEEKS)
    return start, end, cooldown_end


def read_pitch(path):
    """Return a pitch's title and appetite from its Markdown file."""
    text = Path(path).read_text()
    title = re.search(r"^# (.+)$", text, re.MULTILINE).group(1).strip()
    appetite = re.search(r"^## Appetite\s+(.+?)$", text, re.MULTILINE).group(1).strip()
    return {"title": title, "appetite": appetite}


def list_pitches(folder=PITCHES):
    """Return every pitch in the folder, sorted by file name."""
    return [read_pitch(path) for path in sorted(Path(folder).glob("*.md"))]


def load_teams(path=TEAM_FILE):
    """Return the teams from data/team.json."""
    return json.loads(Path(path).read_text())["teams"]


def find_team(name, teams):
    """Return the team with this name, or None."""
    for team in teams:
        if team["name"] == name:
            return team
    return None


def main(argv):
    if len(argv) < 2 or argv[1] not in ("dates", "pitches", "team"):
        print(__doc__.strip())
        return 1
    command = argv[1]
    if command == "dates":
        number = int(argv[2])
        start, end, cooldown_end = cycle_dates(number)
        print(
            f"Cycle {number}: {start.isoformat()} to {end.isoformat()}, "
            f"cool-down until {cooldown_end.isoformat()}"
        )
        return 0
    if command == "pitches":
        for pitch in list_pitches():
            print(f"{pitch['title']}: {pitch['appetite']}")
        return 0
    team = find_team(argv[2], load_teams())
    if team is None:
        print(f"No team named {argv[2]}")
        return 1
    members = ", ".join(f"{member['name']} ({member['role']})" for member in team["members"])
    print(f"{team['name']} ({team['kind']}): {members}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
