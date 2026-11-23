# wrenmail-site

The copy and site configuration for Wrenmail, an email-marketing tool for small online shops.

## Layout

- `docs/product-facts.md`: what the product does, its plans and its limits. Copy is written from this.
- `content/landing/`: the pages of wrenmail.example, in Markdown.
- `site/nav.yaml`: the header and footer links.
- `scripts/wordcount.py`: prints the word count and reading time of each page.
- `tests/`: the tests of the scripts.
- `CHANGELOG.md`: what changed in this repository.

## Development

Count the words in the copy:

```sh
python3 scripts/wordcount.py
```

Run the tests:

```sh
python3 -m unittest
```
