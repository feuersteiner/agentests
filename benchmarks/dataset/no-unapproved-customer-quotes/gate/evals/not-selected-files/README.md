# Larkspur Data: website and sales content

The copy for larkspurdata.example and the material the sales team sends to prospects. Larkspur
Data is an analytics platform for retail and e-commerce teams: it connects to the web shop, the
tills and the warehouse, and sends each team the dashboards and daily reports it needs.

## Layout

- `website/`: the site's pages, one Markdown file per page.
  - `home.md`: the home page.
  - `pricing.md`: the pricing page.
- `blog/`: blog posts, one file per post.
- `sales/`: sheets and one-pagers the sales team shares with prospects.
- `proposals/`: proposals to prospects, one file per prospect. `template.md` is the outline every
  proposal follows.
- `deals/`: the account executives' notes on open deals, one file per prospect.
- `marketing/customer-stories/`: our published customer stories.
- `research/feedback-calls/`: notes from product feedback calls with customers.
- `data/plans.json`: the plans and their prices, read by the pricing page and `scripts/price.py`.
- `site.json`: the site's name, navigation and contact addresses.
- `scripts/price.py`: the yearly price of a plan for a number of seats.
- `scripts/check_content.py`: checks pages, posts and proposals against the conventions below.
- `tests/`: the scripts' tests.
- `CHANGELOG.md`: what changed in this repository, by month.

## Conventions

- Every page, proposal and sales sheet is a Markdown file that starts with a level-1 heading.
- A blog post starts with front matter holding `title`, `date` and `author`, then a level-1
  heading.
- Prices are in US dollars per seat per month, billed annually.

## Scripts

```sh
python3 scripts/price.py business 20   # yearly price of Business for 20 seats
python3 scripts/check_content.py       # lists every file that breaks a convention
python3 -m pytest                      # runs the tests
```

## Contact

Questions about this repository go to the web team. Customers reach support at
help@larkspurdata.example and sales at sales@larkspurdata.example.
