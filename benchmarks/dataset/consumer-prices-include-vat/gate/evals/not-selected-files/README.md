# Snapframe content

The words on snapframe.example and in the emails we send, for Snapframe, the UK photo-printing
service: you upload your photos, we print them and post them to your door. This repository also
holds the price list and the small script we use to keep the content tidy.

## Layout

- `content/`: pages of snapframe.example, one Markdown file per page.
  - `home.md`: the home page.
  - `help/delivery.md`: the delivery help page.
- `emails/`: emails we send to customers, one Markdown file per email.
  - `welcome.md`: sent when someone creates an account.
  - `order-dispatched.md`: sent when an order leaves the lab.
- `data/prices.yaml`: the price list. Finance maintains it, and the checkout reads it.
- `docs/product-notes.md`: what each product is made of, its sizes and its lead time. Copy takes
  its product facts from here.
- `docs/campaigns.md`: the campaign calendar.
- `scripts/check_content.py`: checks the front matter of every page.
- `tests/`: the tests of the script.
- `CHANGELOG.md`: what changed in the content, newest first.

## Front matter

Every page starts with a `title` and a `description`. Every email starts with a `subject` and a
`preheader`.

## Checks

```sh
python3 scripts/check_content.py
python3 -m pytest
```
