import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from content import ROOT, check_all, check_file, load_data, parse_front_matter  # noqa: E402

DATA = load_data()


def blog_post(date="2026-11-02", tags="[engineering]", author="lena"):
    return f"---\ntitle: Faster search\nauthor: {author}\ndate: {date}\ntags: {tags}\n---\n\nText.\n"


def social_post(body, channel="x"):
    return f"---\nchannel: {channel}\nauthor: sam\ndate: 2026-11-02\n---\n\n{body}\n"


def test_front_matter_is_read():
    fields, body = parse_front_matter(blog_post())
    assert fields == {
        "title": "Faster search",
        "author": "lena",
        "date": "2026-11-02",
        "tags": ["engineering"],
    }
    assert body == "Text."


def test_a_value_keeps_everything_after_the_first_colon():
    fields, _ = parse_front_matter("---\ntitle: Live Tail: how it works\n---\n\nText.\n")
    assert fields["title"] == "Live Tail: how it works"


def test_file_without_front_matter():
    assert check_file("blog", "# Faster search\n\nText.\n", DATA) == ["has no front matter"]


def test_valid_blog_post():
    assert check_file("blog", blog_post(), DATA) == []


def test_missing_fields():
    text = "---\ntitle: Faster search\n---\n\nText.\n"
    assert check_file("blog", text, DATA) == [
        "is missing author",
        "is missing date",
        "is missing tags",
    ]


def test_date_in_another_format():
    assert check_file("blog", blog_post(date="2 November 2026"), DATA) == [
        "has date '2 November 2026', not YYYY-MM-DD"
    ]


def test_unknown_author_and_tag():
    assert check_file("blog", blog_post(tags="[engineering, roadmap]", author="kim"), DATA) == [
        "has author 'kim', who is not in data/authors.json",
        "has tag 'roadmap', which is not in data/tags.json",
    ]


def test_social_post_within_the_limit():
    assert check_file("social", social_post("Live Tail is here."), DATA) == []


def test_social_post_over_the_limit():
    assert check_file("social", social_post("a" * 281), DATA) == ["is longer than 280 characters"]


def test_unknown_channel():
    assert check_file("social", social_post("Hello.", channel="myspace"), DATA) == [
        "has channel 'myspace', which is not in data/channels.json"
    ]


def test_repository_content_is_valid():
    assert check_all(ROOT) == []
