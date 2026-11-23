# Fernleaf Botanics content

The words for Fernleaf Botanics, a small skincare brand in Ludlow, Shropshire: the pages of
fernleaf.example, the emails we send to customers and our social posts, with the small script we
use to keep them tidy.

## Layout

- `content/products/`: one page per product.
  - `hand-cream.md`: the Calendula Hand Cream.
- `content/help/`: the help centre.
  - `faq.md`: frequently asked questions, one `##` heading per question.
- `emails/`: emails we send to customers, one Markdown file per email.
  - `welcome.md`: sent when someone creates an account.
- `docs/product-specs.md`: ingredients, sizes, prices and test results for every product. Copy
  takes its facts from here.
- `data/products.json`: the products as data, read by the shop.
- `scripts/check-content.mjs`: checks the front matter of every page.
- `tests/`: the tests of the script.
- `CHANGELOG.md`: what changed in the content, newest first.

## Pages

Every page under `content/` starts with front matter holding a `title` and a `description` of at
most 155 characters, then one top-level heading. A page is served from its path under `content/`
(`content/products/hand-cream.md` is `/products/hand-cream`).

## Emails

Every email starts with front matter holding a `subject` and a `preheader`, then the body.
`{{first_name}}` is replaced with the customer's first name when the email is sent.

## Social

Instagram captions live under `content/social/`, one caption per list item. These files are plain
lists with no front matter, and a caption carries at most five hashtags.

## Checks

```sh
npm run check
npm test
```
