"""Check the front matter of Mapleform's release notes and emails, and the list of releases."""

import re
import sys
from pathlib import Path

SUBJECT_LIMIT = 70
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
NOTES_FILE = re.compile(r"^v(\d+)-(\d+)\.md$")


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


def read_list(text):
    """Read a YAML list of flat mappings, such as data/releases.yaml, into a list of dicts."""
    items = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("- "):
            items.append({})
            stripped = stripped[2:]
        key, separator, value = stripped.partition(":")
        if separator and items:
            items[-1][key.strip()] = value.strip()
    return items


def is_date(value):
    """Whether a value is written as YYYY-MM-DD."""
    return bool(DATE.match(value or ""))


def version_from_filename(name):
    """The version a release-notes file name stands for, such as 4.1 for v4-1.md, or None."""
    match = NOTES_FILE.match(name)
    if not match:
        return None
    return ".".join(match.groups())


def check_release_notes(name, text):
    """Release notes need a title, a version that matches the file name, and a date."""
    fields, _ = split_front_matter(text)
    problems = [f"no {key}" for key in ("title", "version", "date") if not fields.get(key)]
    if fields.get("date") and not is_date(fields["date"]):
        problems.append(f"date {fields['date']} is not YYYY-MM-DD")
    expected = version_from_filename(name)
    if fields.get("version") and expected is not None and fields["version"] != expected:
        problems.append(f"version {fields['version']} does not match the file name")
    return problems


def check_email(text):
    """An email needs a subject of at most SUBJECT_LIMIT characters and a preheader."""
    fields, _ = split_front_matter(text)
    problems = []
    if not fields.get("subject"):
        problems.append("no subject")
    elif len(fields["subject"]) > SUBJECT_LIMIT:
        problems.append(f"subject longer than {SUBJECT_LIMIT} characters")
    if "preheader" not in fields:
        problems.append("no preheader")
    return problems


def check_releases(root):
    """Every release in data/releases.yaml has a version, a date and a notes file that exists."""
    problems = []
    text = (Path(root) / "data" / "releases.yaml").read_text(encoding="utf-8")
    for release in read_list(text):
        label = release.get("version", "?")
        if not is_date(release.get("date")):
            problems.append(f"release {label}: date is not YYYY-MM-DD")
        notes = release.get("notes")
        if not notes or not (Path(root) / notes).is_file():
            problems.append(f"release {label}: notes file not found")
    return problems


def collect(root):
    """Return (path, problem) for every problem in the release notes, the emails and the releases."""
    rows = []
    for path in sorted((Path(root) / "content" / "release-notes").glob("*.md")):
        for problem in check_release_notes(path.name, path.read_text(encoding="utf-8")):
            rows.append((path.relative_to(root).as_posix(), problem))
    for path in sorted((Path(root) / "emails").glob("*.md")):
        for problem in check_email(path.read_text(encoding="utf-8")):
            rows.append((path.relative_to(root).as_posix(), problem))
    for problem in check_releases(root):
        rows.append(("data/releases.yaml", problem))
    return rows


def main(root="."):
    rows = collect(root)
    for path, problem in rows:
        print(f"{path}: {problem}")
    return 1 if rows else 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:2]))
