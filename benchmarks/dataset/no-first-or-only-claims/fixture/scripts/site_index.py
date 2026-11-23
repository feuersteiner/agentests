"""Builds the site index from the front matter of every page under content/."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORDS_PER_MINUTE = 200


def parse_front_matter(text):
    """Return the front matter of a Markdown file as a dict, or None when it has none."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    fields = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return fields
        name, separator, value = line.partition(":")
        if separator:
            fields[name.strip()] = value.strip()
    return None


def body_of(text):
    """Return the text after the front matter."""
    parts = text.split("---", 2)
    return parts[2] if len(parts) == 3 else text


def reading_minutes(text):
    """Return the minutes it takes to read the body of a page."""
    words = len(body_of(text).split())
    return words // WORDS_PER_MINUTE


def url_for(path):
    """Return the site URL of a content file, given its path relative to content/."""
    slug = Path(path).with_suffix("").as_posix()
    return "/" if slug == "home" else f"/{slug}"


def tracked_link(url, campaign):
    """Return the URL with our campaign parameters, for links in emails."""
    return f"{url}?utm_source=email&utm_campaign={campaign}"


def build_index(content):
    """Return one entry per page under the content folder, sorted by URL."""
    entries = []
    problems = []
    for path in sorted(content.rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        relative = path.relative_to(content).as_posix()
        fields = parse_front_matter(text)
        if fields is None:
            problems.append(f"{relative}: no front matter")
            continue
        for name in ("title", "description"):
            if not fields.get(name):
                problems.append(f"{relative}: missing {name}")
        entries.append(
            {
                "url": url_for(relative),
                "title": fields.get("title", ""),
                "minutes": reading_minutes(text),
            }
        )
    return sorted(entries, key=lambda entry: entry["url"]), problems


def main():
    entries, problems = build_index(ROOT / "content")
    for problem in problems:
        print(problem, file=sys.stderr)
    print(json.dumps(entries, indent=2))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
