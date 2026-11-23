# Tessellate website and policies

The pages of tessellate.example, the website of Tessellate, an online whiteboard for product teams,
together with our privacy records and product briefs, and the small script that keeps the pages
tidy.

## Layout

- `website/`: the pages of tessellate.example, one Markdown file per page.
  - `index.md`: the home page.
  - `signup.md`: the signup page.
  - `privacy.md`: the privacy notice.
  - `nav.yaml`: the header and footer links.
- `privacy/data-inventory.md`: every use we make of personal data, kept by the privacy lead.
- `docs/mobile-app.md`: the brief for the first release of the mobile apps.
- `data/company.json`: the company's legal details and contact addresses.
- `scripts/check_site.py`: checks the front matter and the internal links of the pages.
- `tests/`: the tests of the script.
- `CHANGELOG.md`: what changed, newest first.

## Front matter

Every page under `website/` starts with a front matter block that has a `title` and a
`description`.

## Checks

```sh
python3 scripts/check_site.py
python3 -m pytest
```

Questions about the pages go to the web team at web@tessellate.example; questions about personal
data go to privacy@tessellate.example.
