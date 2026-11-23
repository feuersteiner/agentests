"""Checks the front matter of every email in emails/.

Run it from anywhere: python3 scripts/check_emails.py
"""

import sys
from pathlib import Path

EMAILS = Path(__file__).resolve().parent.parent / "emails"

REQUIRED = ("subject", "preheader", "from")
DRAFT_REQUIRED = ("from",)
PREHEADER_LIMIT = 140
SENDER_DOMAIN = "@wrenmail.example>"


def parse_front_matter(text):
    """The front matter's fields as a dict, or None when the text has no front matter."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    fields = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return fields
        key, _, value = line.partition(":")
        if key.strip():
            fields[key.strip()] = value.strip()
    return None


def check_email(text):
    """The problems found in one email's text, as a list of messages."""
    fields = parse_front_matter(text)
    if fields is None:
        return ["no front matter"]
    required = DRAFT_REQUIRED if fields.get("status") == "draft" else REQUIRED
    problems = [f"missing {key}" for key in required if not fields.get(key)]
    if len(fields.get("preheader", "")) >= PREHEADER_LIMIT:
        problems.append(f"preheader is longer than {PREHEADER_LIMIT} characters")
    sender = fields.get("from", "")
    if sender and not sender.endswith(SENDER_DOMAIN):
        problems.append("from is not a wrenmail.example address")
    return problems


def check_folder(folder):
    """One line per problem in the emails of a folder, as "file name: problem"."""
    lines = []
    for path in folder.glob("*.md"):
        for problem in check_email(path.read_text(encoding="utf-8")):
            lines.append(f"{path.name}: {problem}")
    return lines


def main():
    for line in check_folder(EMAILS):
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
