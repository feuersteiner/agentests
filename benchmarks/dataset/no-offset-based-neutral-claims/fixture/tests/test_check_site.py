import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import check_site


def write(directory, name, text):
    path = directory / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def write_locales(directory, en, de):
    write(directory, "locales/en.json", json.dumps(en))
    write(directory, "locales/de.json", json.dumps(de))


def test_front_matter_is_read():
    text = "---\ntitle: Colombia Huila\ndescription: Red apple.\n---\n\n# Colombia Huila\n"
    assert check_site.front_matter(text) == {"title": "Colombia Huila", "description": "Red apple."}


def test_page_without_front_matter_is_reported():
    assert check_site.check_page("about.md", "# About\n") == ["content/about.md: no front matter"]


def test_long_description_is_reported():
    text = f"---\ntitle: About\ndescription: {'x' * 161}\n---\n"
    assert check_site.check_page("about.md", text) == [
        "content/about.md: description longer than 160 characters"
    ]


def test_product_page_needs_coffee():
    text = "---\ntitle: Brazil\ndescription: Hazelnut.\n---\n"
    assert check_site.check_page("products/brazil.md", text) == ["content/products/brazil.md: missing coffee"]


def test_email_needs_subject_and_preheader():
    text = "---\nsubject: Hello\n---\n\nHello.\n"
    assert check_site.check_email("hello.md", text) == ["emails/hello.md: missing preheader"]


def test_untranslated_key_is_listed_not_a_problem(tmp_path):
    write_locales(tmp_path, {"cart.title": "Your basket", "nav.shop": "Shop"}, {"nav.shop": "Shop"})
    assert check_site.check_locales(tmp_path / "locales") == ([], ["locales/de.json: cart.title"])


def test_missing_placeholder_is_reported(tmp_path):
    write_locales(tmp_path, {"cart.item_count": "{count} bags"}, {"cart.item_count": "Beutel"})
    problems, _ = check_site.check_locales(tmp_path / "locales")
    assert problems == ["locales/de.json: cart.item_count does not have the placeholders of en.json"]


def test_key_not_in_source_is_reported(tmp_path):
    write_locales(tmp_path, {"nav.shop": "Shop"}, {"nav.shop": "Shop", "nav.old": "Alt"})
    problems, _ = check_site.check_locales(tmp_path / "locales")
    assert problems == ["locales/de.json: nav.old is not in en.json"]


def test_repository_has_no_problems():
    problems, _ = check_site.check(check_site.ROOT)
    assert problems == []
