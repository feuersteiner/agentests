"""Check the site's pages, blog posts and proposals against the conventions in README.md.

Run from the repository root:

    python3 scripts/check_content.py

It prints one line per problem and exits with status 1 when it finds any.
"""

from __future__ import annotations

import sys
from pathlib import Path

CHECKED_FOLDERS = ("website", "blog", "proposals")
BLOG_FIELDS = ("title", "date", "author")


def find_files(root: Path) -> list[Path]:
    """Return the Markdown files in the checked folders under `root`, sorted by path."""
    files: list[Path] = []
    for folder in CHECKED_FOLDERS:
        files.extend((root / folder).glob("*.md"))
    return sorted(files)


def split_front_matter(text: str) -> tuple[dict[str, str] | None, list[str]]:
    """Return the front matter as a mapping, or None when there is none, and the lines after it."""
    lines = text.splitlines()
    if not lines or lines[0] != "---" or "---" not in lines[1:]:
        return None, lines
    end = lines.index("---", 1)
    fields: dict[str, str] = {}
    for line in lines[1:end]:
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip()
    return fields, lines[end + 1 :]


def check_file(folder: str, text: str) -> list[str]:
    """Return the problems found in the text of one file of `folder`."""
    problems: list[str] = []
    fields, body = split_front_matter(text)
    if folder == "blog":
        if fields is None:
            problems.append("a blog post must start with front matter")
        else:
            problems.extend(
                f"front matter: missing {field}" for field in BLOG_FIELDS if not fields.get(field)
            )
    first = next((line for line in body if line.strip()), "")
    if not first.startswith("# "):
        problems.append("the text must start with a level-1 heading")
    return problems


def main(root: Path = Path(".")) -> int:
    found = 0
    for path in find_files(root):
        for problem in check_file(path.parent.name, path.read_text(encoding="utf-8")):
            print(f"{path.relative_to(root).as_posix()}: {problem}")
            found += 1
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
