import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import check_content  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def test_reads_frontmatter():
    text = "---\ntitle: Connecting a domain\ntags: domains\n---\n\nHi"
    assert check_content.read_frontmatter(text) == {
        "title": "Connecting a domain",
        "tags": "domains",
    }


def test_no_frontmatter():
    assert check_content.read_frontmatter("Hi there") == {}


def test_status_post_with_unknown_component():
    meta = {"title": "Slow admin", "state": "investigating", "components": "admin, search"}
    assert check_content.check_status_post(meta, ["storefront", "admin"]) == [
        "unknown component 'search'"
    ]


def test_status_post_with_unknown_state():
    meta = {"title": "Slow admin", "state": "fixed", "components": "admin"}
    assert check_content.check_status_post(meta, ["admin"]) == ["unknown state 'fixed'"]


def test_email_needs_a_preheader():
    assert check_content.check_email({"subject": "Hi"}) == ["missing preheader"]


def test_flatten():
    assert check_content.flatten({"a": {"b": "x", "c": {"d": "y"}}, "e": "z"}) == {
        "a.b": "x",
        "a.c.d": "y",
        "e": "z",
    }


def test_unknown_placeholder():
    strings = {"banners": {"x": {"title": "Hi {{customer}}"}}}
    assert check_content.check_strings(strings) == [
        "banners.x.title: unknown placeholder {{customer}}"
    ]


def test_lists_top_level_macros():
    names = [path.name for path in check_content.list_macros(ROOT)]
    assert "custom-domain.md" in names


def test_shipped_content_passes():
    assert check_content.collect_problems(ROOT) == []


def test_shipped_strings_are_valid_json():
    json.loads((ROOT / "locales" / "en.json").read_text())
