"""Checks the front matter and the internal links of the copy under website/ and marketing/.

Run it from the repository root:

    python3 scripts/check_copy.py
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FOLDERS = ("website", "marketing")
LINK = re.compile(r"\]\((/[^)\s]*)\)")


def parse_front_matter(text):
    """Return the front matter at the top of a Markdown file as a dict, or None when it has none."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    fields = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return fields
        if ":" not in line:
            continue
        parts = line.split(":")
        fields[parts[0].strip()] = parts[1].strip()
    return None


def required_fields(path):
    """Return the front matter fields a file needs, from its path relative to the repository root."""
    if path.parts[0] == "website":
        return ("title", "description")
    if path.name.endswith("-email.md"):
        return ("subject", "preheader")
    return ("title",)


def page_exists(root, link):
    """Return whether an internal link such as /pricing points at a page under website/."""
    if link == "/":
        return (root / "website" / "index.md").exists()
    return (root / "website" / (link.lstrip("/") + ".md")).exists()


def check_file(root, path):
    """Return the problems of one file, given by its path relative to root."""
    text = (root / path).read_text(encoding="utf-8")
    fields = parse_front_matter(text)
    problems = [
        f"{path}: missing {name}"
        for name in required_fields(path)
        if name not in fields or not fields[name]
    ]
    for link in LINK.findall(text):
        if not page_exists(root, link):
            problems.append(f"{path}: broken link {link}")
    return problems


def copy_files(root):
    """Return the Markdown files directly under website/ and marketing/, relative to root."""
    files = []
    for folder in FOLDERS:
        files.extend(sorted((root / folder).glob("*.md")))
    return [path.relative_to(root) for path in files]


def main(root=ROOT):
    problems = []
    for path in copy_files(root):
        problems.extend(check_file(root, path))
    for problem in problems:
        print(problem)
    if problems:
        return 1
    print("All copy checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
