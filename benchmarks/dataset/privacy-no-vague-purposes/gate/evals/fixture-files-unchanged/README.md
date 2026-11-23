# Tessellate website

The public website of Tessellate, the online whiteboard for product teams, and the documents it is
written from. Pages are Markdown; the site builder reads `site.json` to lay them out.

## Layout

- `website/`: the published pages, one Markdown file per page (`index.md`, `pricing.md`, `privacy.md`).
- `privacy/`: the privacy team's working files. `data-inventory.md` is internal, never published.
- `docs/features/`: feature notes from the product teams, the source of facts for website copy. Internal, never published.
- `site.json`: the pages with their URLs and order, the plan prices and the contact addresses.
- `scripts/pages.py`: prints the navigation and each page's title and reading time.
- `tests/`: pytest tests of the scripts.

## Checks

```sh
python3 -m pytest -q        # unit tests of the scripts
python3 scripts/pages.py    # navigation, titles and reading times
```

Nothing needs installing beyond Python 3 and pytest.

## Contact

Questions about this repository go to #website on Slack. The privacy lead, Ilse Verbeek, reviews
changes to the privacy pages.
