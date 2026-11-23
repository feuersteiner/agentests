"""Checks merchant-facing content before it is published.

Run from the repository root: python3 scripts/check_content.py
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

STATUS_STATES = {"investigating", "identifed", "monitoring", "resolved"}
PLACEHOLDER = re.compile(r"\{\{\s*([A-Za-z0-9_]+)\s*\}\}")
# The values the admin app can fill into locales/en.json.
APP_PLACEHOLDERS = {
    "first_name",
    "store_name",
    "plan",
    "days_left",
    "payout_amount",
    "payout_date",
}


def read_frontmatter(text):
    """The key: value pairs between the opening and the closing --- line."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    meta = {}
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if ":" in line:
            parts = line.split(":")
            meta[parts[0].strip()] = parts[1].strip()
    return meta


def read_components(root):
    """The component ids listed in content/status/components.yaml."""
    path = root / "content" / "status" / "components.yaml"
    return re.findall(r"^- id: *(\S+)", path.read_text(), re.MULTILINE)


def check_status_post(meta, components):
    problems = []
    for key in ("title", "state", "components"):
        if not meta.get(key):
            problems.append(f"missing {key}")
    state = meta.get("state")
    if state and state not in STATUS_STATES:
        problems.append(f"unknown state {state!r}")
    for component in filter(None, (c.strip() for c in meta.get("components", "").split(","))):
        if component not in components:
            problems.append(f"unknown component {component!r}")
    return problems


def check_email(meta):
    return [f"missing {key}" for key in ("subject", "preheader") if not meta.get(key)]


def check_macro(meta):
    return [f"missing {key}" for key in ("title", "tags") if not meta.get(key)]


def flatten(strings, prefix=""):
    """{"a": {"b": "x"}} as {"a.b": "x"}."""
    flat = {}
    for key, value in strings.items():
        name = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            flat.update(flatten(value, name))
        else:
            flat[name] = value
    return flat


def check_strings(strings):
    problems = []
    for key, value in flatten(strings).items():
        if not str(value).strip():
            problems.append(f"{key}: empty string")
        for name in PLACEHOLDER.findall(str(value)):
            if name not in APP_PLACEHOLDERS:
                problems.append(f"{key}: unknown placeholder {{{{{name}}}}}")
    return problems


def list_macros(root):
    return sorted((root / "support" / "macros").glob("*.md"))


def collect_problems(root):
    problems = []
    components = read_components(root)
    for path in sorted((root / "content" / "status").glob("*.md")):
        meta = read_frontmatter(path.read_text())
        problems += [f"{path.relative_to(root)}: {p}" for p in check_status_post(meta, components)]
    for path in sorted((root / "emails").glob("*.md")):
        meta = read_frontmatter(path.read_text())
        problems += [f"{path.relative_to(root)}: {p}" for p in check_email(meta)]
    for path in list_macros(root):
        meta = read_frontmatter(path.read_text())
        problems += [f"{path.relative_to(root)}: {p}" for p in check_macro(meta)]
    strings = json.loads((root / "locales" / "en.json").read_text())
    problems += [f"locales/en.json: {p}" for p in check_strings(strings)]
    return problems


def main(root=ROOT):
    problems = collect_problems(root)
    for problem in problems:
        print(problem)
    if not problems:
        print("All content checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
