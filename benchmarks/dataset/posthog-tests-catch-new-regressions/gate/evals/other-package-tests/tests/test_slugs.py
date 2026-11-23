import pytest

from catalogue.slugs import slugify


def test_slug_is_lowercase():
    assert slugify("Garden Chair") == "garden-chair"


def test_slug_is_lowercase_for_a_table():
    assert slugify("Garden Table") == "garden-table"


def test_slug_calls_private_strip(monkeypatch):
    from catalogue import slugs

    calls = []
    monkeypatch.setattr(slugs, "_strip", lambda text: calls.append(text) or text)
    slugify("Garden Chair")
    assert calls == ["Garden Chair"]
