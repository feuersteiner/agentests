"""Checks the documents under proposals/, website/ and decks/ against the README's conventions.

    python3 scripts/check_docs.py

Prints one line per problem and exits with 1 when there is any. Templates under
proposals/templates/ are not checked.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FOLDERS = ("proposals", "website", "decks")
VALID_UNTIL = re.compile(r"^_Valid until \d{1,2} [A-Z][a-z]+ \d{4}_$")
SLIDE = re.compile(r"^## Slide (\d+): \S")


def check_proposal(lines):
    """Return the problems of a proposal's lines."""
    if not lines or not lines[0].startswith("# "):
        return ["does not start with a top-level heading"]
    rest = [line for line in lines[1:] if line.strip()]
    if not rest or not VALID_UNTIL.match(rest[0]):
        return ["has no '_Valid until <day> <month> <year>_' line under its heading"]
    return []


def check_page(lines):
    """Return the problems of a website page's lines."""
    if not lines or lines[0] != "---" or "---" not in lines[1:]:
        return ["does not start with front matter"]
    end = lines.index("---", 1)
    keys = {line.split(":", 1)[0].strip() for line in lines[1:end] if ":" in line}
    return [f"has no {key}: in its front matter" for key in ("title", "description") if key not in keys]


def check_deck(lines):
    """Return the problems of a deck section's lines."""
    if not lines or not lines[0].startswith("# "):
        return ["does not start with a top-level heading"]
    return [
        f"has a slide heading that is not '## Slide <n>: <title>': {line}"
        for line in lines
        if line.startswith("## ") and not SLIDE.match(line)
    ]


CHECKS = {"proposals": check_proposal, "website": check_page, "decks": check_deck}


def check_document(folder, text):
    """Return the problems of one document of a folder, as a list of sentences."""
    problems = CHECKS[folder](text.splitlines())
    if not text.endswith("\n"):
        problems.append("does not end with a newline")
    return problems


def check_all(root=ROOT):
    """Return (path, problem) for every problem in every document."""
    found = []
    for folder in FOLDERS:
        for path in sorted((Path(root) / folder).glob("*.md")):
            text = path.read_text(encoding="utf-8")
            for problem in check_document(folder, text):
                found.append((path.relative_to(root).as_posix(), problem))
    return found


def main():
    found = check_all()
    for path, problem in found:
        print(f"{path}: {problem}")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
