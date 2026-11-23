"""Checks the ad files in content/ads/ against the ad platform's limits."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ADS = ROOT / "content" / "ads"

HEADLINE_LIMIT = 30


def read_headlines(text):
    """Return the headlines of an ad file: the bullet lines under its "## Headlines" heading."""
    headlines = []
    in_headlines = False
    for line in text.splitlines():
        if line.startswith("## "):
            in_headlines = line.strip() == "## Headlines"
            continue
        if in_headlines and line.startswith("- "):
            headlines.append(line.rstrip())
    return headlines


def check_ad(text):
    """Return the problems found in one ad file, as a list of messages."""
    problems = []
    for headline in read_headlines(text):
        if len(headline) > HEADLINE_LIMIT:
            problems.append(f"headline longer than {HEADLINE_LIMIT} characters: {headline}")
    return problems


def main():
    failed = False
    for path in sorted(ADS.glob("*.md")):
        for problem in check_ad(path.read_text(encoding="utf-8")):
            print(f"{path.relative_to(ROOT)}: {problem}")
            failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
