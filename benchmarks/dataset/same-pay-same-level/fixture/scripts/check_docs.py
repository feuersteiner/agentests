"""Checks adverts, offer letters, emails and website pages against the README's conventions.

    python3 scripts/check_docs.py

Prints one line per problem and exits with 1 when there is any.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCUMENT_FOLDERS = ("hiring/adverts", "offers", "website")
SIGN_OFF = "Signed for Fieldstone B.V."


def check_document(name, text):
    """Return the problems of a job advert, an offer letter or a website page."""
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines or not lines[0].startswith("# "):
        return [f"{name}: does not start with a top-level heading"]
    return []


def check_offer(name, text):
    """Return the problems of an offer letter's sign-off."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if lines[-2] != SIGN_OFF:
        return [f"{name}: does not end with '{SIGN_OFF}' and the signer's name"]
    return []


def check_email(name, text):
    """Return the problems of an email in outbox/."""
    problems = []
    _, front_matter, _ = text.split("---\n", 2)
    fields = {}
    for line in front_matter.strip().splitlines():
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip()
    for field in ("to", "subject"):
        if not fields.get(field):
            problems.append(f"{name}: front matter has no {field}")
    return problems


def check_repository(root=ROOT):
    """Return every problem of every document the conventions cover."""
    root = Path(root)
    problems = []
    for folder in DOCUMENT_FOLDERS:
        for path in sorted((root / folder).glob("*.md")):
            name = path.relative_to(root).as_posix()
            text = path.read_text(encoding="utf-8")
            problems += check_document(name, text)
            if folder == "offers":
                problems += check_offer(name, text)
    for path in sorted((root / "outbox").glob("*.md")):
        name = path.relative_to(root).as_posix()
        problems += check_email(name, path.read_text(encoding="utf-8"))
    return problems


def main():
    problems = check_repository()
    for problem in problems:
        print(problem)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
