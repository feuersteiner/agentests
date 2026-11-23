"""Check the front matter of the pages and emails, and the locale files.

Pages are the Markdown files under content/, emails the Markdown files under emails/. Each starts
with front matter between two lines of "---", one "key: value" per line. locales/en.json is the
source of the interface text; every other locale file translates its keys.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

DESCRIPTION_LIMIT = 160
PAGE_FIELDS = ("title", "description")
EMAIL_FIELDS = ("subject", "preheader")
PLACEHOLDER = re.compile(r"\{(\w+)\}")


def front_matter(text):
    """Return the front matter of a Markdown text as a dict, or None when it has none."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    fields = {}
    for line in lines[1:]:
        if line.strip() == "---":
            return fields
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip()
    return None


def check_page(name, text):
    """Return the problems of one page; name is its path under content/."""
    fields = front_matter(text)
    if fields is None:
        return [f"content/{name}: no front matter"]
    problems = [f"content/{name}: missing {key}" for key in PAGE_FIELDS if not fields.get(key)]
    if len(fields.get("description", "")) > DESCRIPTION_LIMIT:
        problems.append(f"content/{name}: description longer than {DESCRIPTION_LIMIT} characters")
    if name.startswith("products/") and not fields.get("coffee"):
        problems.append(f"content/{name}: missing coffee")
    return problems


def check_email(name, text):
    """Return the problems of one email; name is its path under emails/."""
    fields = front_matter(text)
    if fields is None:
        return [f"emails/{name}: no front matter"]
    return [f"emails/{name}: missing {key}" for key in EMAIL_FIELDS if not fields.get(key)]


def placeholders(text):
    """Return the placeholders of an interface string, such as ["count", "total"]."""
    return PLACEHOLDER.findall(text)


def check_locales(locales_dir):
    """Return (problems, untranslated) for the locale files of locales_dir."""
    source = json.loads((locales_dir / "en.json").read_text(encoding="utf-8"))
    problems, untranslated = [], []
    for path in sorted(locales_dir.glob("*.json")):
        if path.name == "en.json":
            continue
        strings = json.loads(path.read_text(encoding="utf-8"))
        for key, text in source.items():
            if key not in strings:
                untranslated.append(f"locales/{path.name}: {key}")
            elif placeholders(strings[key]) != placeholders(text):
                problems.append(f"locales/{path.name}: {key} does not have the placeholders of en.json")
        for key in strings:
            if key not in source:
                problems.append(f"locales/{path.name}: {key} is not in en.json")
    return problems, untranslated


def check(root):
    """Return (problems, untranslated) for the repository at root."""
    problems = []
    content = root / "content"
    for page in sorted(content.glob("*/**/*.md")):
        name = page.relative_to(content).as_posix()
        problems += check_page(name, page.read_text(encoding="utf-8"))
    emails = root / "emails"
    for email in sorted(emails.glob("*.md")):
        problems += check_email(email.name, email.read_text(encoding="utf-8"))
    locale_problems, untranslated = check_locales(root / "locales")
    return problems + locale_problems, untranslated


def main():
    problems, untranslated = check(ROOT)
    for line in untranslated:
        print(f"untranslated: {line}")
    for problem in problems:
        print(problem)
    print(f"{len(problems)} problem(s), {len(untranslated)} untranslated key(s).")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
