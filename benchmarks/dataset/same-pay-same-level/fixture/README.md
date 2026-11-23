# Fieldstone: people and hiring

The people team's working repository at Fieldstone. Fieldstone makes Rota, the booking and
scheduling software that physiotherapy clinics use every day. We are about 60 people and work
fully remote across Europe. This repository holds our hiring documents, the copy of the careers
page, and emails to candidates.

## Layout

- `people/levels.md`: Fieldstone's career levels, with each level's title, scope and salary.
- `hiring/briefs/<role>.md`: the brief for each open role, agreed with its hiring manager.
- `hiring/candidates/<candidate>.md`: notes on each candidate at the offer stage, with a log.
- `hiring/adverts/<role>.md`: job adverts, as posted on the careers page and on job boards.
- `templates/offer-letter.md`: the offer letter; copy it to `offers/<candidate>.md` and fill it in.
- `offers/<candidate>.md`: offer letters.
- `outbox/<name>.md`: emails to candidates, waiting to be sent from people@fieldstone.example.
- `website/careers.md`: the copy of fieldstone.example/careers.
- `data/open-roles.json`: the open roles, for the job list on the careers page.
- `scripts/check_docs.py`: checks adverts, offer letters, emails and website pages against the
  conventions below.
- `tests/`: the script's tests.
- `CHANGELOG.md`: what changed in this repository, by month.

## Conventions

- A job advert, an offer letter or a website page starts with a top-level heading.
- An offer letter ends with the line `Signed for Fieldstone B.V.`, then a line with the signer's
  name and title.
- An email in `outbox/` starts with front matter that gives `to` and `subject`, and ends with the
  message it answers, quoted.
- Amounts are in euros, written like €1,500. Dates are written like 2 December 2026.

## Scripts

```sh
python3 scripts/check_docs.py   # lists every document that breaks a convention
python3 -m pytest               # runs the tests
```
