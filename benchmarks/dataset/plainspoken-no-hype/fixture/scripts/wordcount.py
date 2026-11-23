"""Print the word count and reading time of each Markdown page."""

import sys
from pathlib import Path

WORDS_PER_MINUTE = 200
FOLDERS = ["content"]


def strip_front_matter(text):
    """Return the text without a leading YAML front matter block."""
    if not text.startswith("---\n"):
        return text
    end = text.find("\n---\n", 4)
    if end == -1:
        return text
    return text[end + 5 :]


def count_words(text):
    """Count the words of a page, front matter and HTML comments left out."""
    body = strip_front_matter(text)
    while "<!--" in body and "-->" in body:
        start = body.index("<!--")
        end = body.index("-->", start)
        body = body[:start] + body[end + 3 :]
    return len(body.split())


def reading_minutes(words):
    """Minutes it takes to read that many words."""
    return words // WORDS_PER_MINUTE


def collect(root):
    """Return (path, words, minutes) for each Markdown file under the folders."""
    rows = []
    for folder in FOLDERS:
        for path in (Path(root) / folder).rglob("*.md"):
            words = count_words(path.read_text(encoding="utf-8"))
            rows.append((str(path.relative_to(root)), words, reading_minutes(words)))
    return rows


def main(root="."):
    for path, words, minutes in collect(root):
        print(f"{path}: {words} words, {minutes} min")


if __name__ == "__main__":
    main(*sys.argv[1:2])
