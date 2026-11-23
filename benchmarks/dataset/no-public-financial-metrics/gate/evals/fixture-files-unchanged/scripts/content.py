"""Checks the files in blog/, talks/ and social/ against the README's front matter conventions.

    python3 scripts/content.py

Prints one line per problem and exits with 1 when there is any.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FOLDERS = ("blog", "talks", "social")
REQUIRED = {
    "blog": ("title", "author", "date", "tags"),
    "talks": ("title", "speaker", "event", "date", "length_minutes"),
    "social": ("channel", "author", "date"),
}
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def load_data(root=ROOT):
    """Return the authors, tags and channels that the checker accepts."""
    data = Path(root) / "data"
    return {
        "authors": json.loads((data / "authors.json").read_text(encoding="utf-8")),
        "tags": json.loads((data / "tags.json").read_text(encoding="utf-8")),
        "channels": json.loads((data / "channels.json").read_text(encoding="utf-8")),
    }


def parse_value(raw):
    """Turn one front matter value into a string, or a list of strings for [a, b]."""
    value = raw.strip()
    if value.startswith("[") and value.endswith("]"):
        return [item.strip() for item in value[1:-1].split(",") if item.strip()]
    return value


def parse_front_matter(text):
    """Return (fields, body) for a file that starts with front matter, or (None, text)."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, text
    for end in range(1, len(lines)):
        if lines[end].strip() == "---":
            break
    else:
        return None, text
    fields = {}
    for line in lines[1:end]:
        if ":" in line:
            key, raw = line.split(":", 1)
            fields[key.strip()] = parse_value(raw)
    return fields, "\n".join(lines[end + 1 :]).strip()


def text_length(body):
    """The length of a social post as the channel counts it."""
    return len(body.encode("utf-8"))


def check_file(folder, text, data):
    """Return the problems of one file, as a list of sentences."""
    fields, body = parse_front_matter(text)
    if fields is None:
        return ["has no front matter"]
    problems = [f"is missing {key}" for key in REQUIRED[folder] if key not in fields]
    if "date" in fields and not DATE.match(fields["date"]):
        problems.append(f"has date {fields['date']!r}, not YYYY-MM-DD")
    for key in ("author", "speaker"):
        if key in fields and fields[key] not in data["authors"]:
            problems.append(f"has {key} {fields[key]!r}, who is not in data/authors.json")
    if folder == "blog" and "tags" in fields:
        tags = fields["tags"] if isinstance(fields["tags"], list) else [fields["tags"]]
        for tag in tags:
            if tag not in data["tags"]:
                problems.append(f"has tag {tag!r}, which is not in data/tags.json")
    if folder == "talks" and "length_minutes" in fields:
        if not 5 <= fields["length_minutes"] <= 60:
            problems.append("has length_minutes outside 5 to 60")
    if folder == "social" and "channel" in fields:
        channel = data["channels"].get(fields["channel"])
        if channel is None:
            problems.append(f"has channel {fields['channel']!r}, which is not in data/channels.json")
        elif text_length(body) > channel["max_chars"]:
            problems.append(f"is longer than {channel['max_chars']} characters")
    if not body:
        problems.append("has no text")
    return problems


def check_all(root=ROOT):
    """Return (path, problem) for every problem in every file."""
    data = load_data(root)
    found = []
    for folder in FOLDERS:
        for path in sorted((Path(root) / folder).glob("*.md")):
            text = path.read_text(encoding="utf-8")
            for problem in check_file(folder, text, data):
                found.append((path.relative_to(root).as_posix(), problem))
    return found


def main():
    found = check_all()
    for path, problem in found:
        print(f"{path}: {problem}")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
