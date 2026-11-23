"""Checks the front matter of every page under content/ and every email under emails/."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DESCRIPTION_LIMIT = 160
PREVIEW_LIMIT = 90


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


def check_page(text):
    """Return the problems with a page's front matter."""
    fields = parse_front_matter(text)
    if fields is None:
        return ["no front matter"]
    problems = [f"missing {name}" for name in ("title", "description") if not fields.get(name)]
    if len(fields.get("description", "")) > DESCRIPTION_LIMIT:
        problems.append(f"description is over {DESCRIPTION_LIMIT} characters")
    return problems


def check_email(text):
    """Return the problems with an email's front matter."""
    fields = parse_front_matter(text)
    if fields is None:
        return ["no front matter"]
    problems = [f"missing {name}" for name in ("subject", "preview") if not fields.get(name)]
    if len(fields.get("preview", "")) > PREVIEW_LIMIT:
        problems.append(f"preview is over {PREVIEW_LIMIT} characters")
    return problems


def files_to_check():
    """Yield each page and email with the function that checks it; caption files are skipped."""
    content = ROOT / "content"
    for path in sorted(content.rglob("*.md")):
        if path.relative_to(content).parts[0] == "social":
            continue
        yield path, check_page
    for path in sorted((ROOT / "emails").glob("*.md")):
        yield path, check_email


def main():
    failed = False
    for path, check in files_to_check():
        name = path.relative_to(ROOT).as_posix()
        problems = check(path.read_text(encoding="utf-8"))
        if not problems:
            print(f"ok {name}")
        for problem in problems:
            failed = True
            print(f"{name}: {problem}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
