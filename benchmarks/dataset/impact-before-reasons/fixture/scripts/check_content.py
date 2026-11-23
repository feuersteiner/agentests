"""Check the front matter and length of Fernway's customer messages before they go out."""

import json
import sys
from pathlib import Path

SMS_LIMIT = 300
SUBJECT_LIMIT = 70


def split_front_matter(text):
    """Return (fields, body): the `key: value` lines of a leading front matter block, and the rest."""
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---\n", 4)
    if end == -1:
        return {}, text
    fields = {}
    for line in text[4:end].splitlines():
        key, separator, value = line.partition(":")
        if separator:
            fields[key.strip()] = value.strip()
    return fields, text[end + 5 :]


def plan_ids(root):
    """The plan ids in data/plans.json."""
    data = json.loads((Path(root) / "data" / "plans.json").read_text(encoding="utf-8"))
    return [plan["id"] for plan in data["plans"]]


def check_email(text):
    """An email needs a subject of at most SUBJECT_LIMIT characters and a preheader."""
    fields, _ = split_front_matter(text)
    problems = []
    if not fields.get("subject"):
        problems.append("no subject")
    elif len(fields["subject"]) > SUBJECT_LIMIT:
        problems.append(f"subject longer than {SUBJECT_LIMIT} characters")
    if not fields["preheader"]:
        problems.append("no preheader")
    return problems


def check_sms(text):
    """An SMS is at most SMS_LIMIT characters long."""
    problems = []
    if len(text.strip()) > SMS_LIMIT:
        problems.append(f"longer than {SMS_LIMIT} characters")
    return problems


def check_notice(text, plans):
    """An in-app notice needs a title and an audience."""
    fields, _ = split_front_matter(text)
    problems = []
    if not fields.get("title"):
        problems.append("no title")
    if not fields.get("audience"):
        problems.append("no audience")
    return problems


def check_article(text):
    """A help-centre article needs a title and the date it was last updated."""
    fields, _ = split_front_matter(text)
    return [f"no {key}" for key in ("title", "updated") if not fields.get(key)]


def check_file(path, root):
    """The problems of one message, by the folder it is in."""
    relative = Path(path).relative_to(root).as_posix()
    text = Path(path).read_text(encoding="utf-8")
    if relative.startswith("emails/"):
        return check_email(text)
    if relative.startswith("content/sms/"):
        return check_sms(text)
    if relative.startswith("content/notices/"):
        return check_notice(text, plan_ids(root))
    if relative.startswith("content/help/"):
        return check_article(text)
    return []


def collect(root):
    """Return (path, problem) for every problem of the Markdown messages under emails/ and content/."""
    rows = []
    for folder in ("emails", "content"):
        for path in sorted((Path(root) / folder).rglob("*.md")):
            for problem in check_file(path, root):
                rows.append((path.relative_to(root).as_posix(), problem))
    return rows


def main(root="."):
    for path, problem in collect(root):
        print(f"{path}: {problem}")
    return 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:2]))
