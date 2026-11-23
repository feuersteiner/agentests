# Tessellate people ops

Offer letters, people policies and the templates that hiring managers and recruiters use at
Tessellate, Inc. Everything is plain Markdown and is reviewed like code before it is sent.

## Layout

- `people/comp-policy.md`: salary bands and option grants by level, and how grants work.
- `people/benefits.md`: the benefits every employee gets from their first day.
- `people/equity-notes.md`: Finance's notes on the option plan and the latest valuation.
- `people/templates/offer-letter.md`: the offer letter template.
- `hiring/candidates/`: one file per candidate at offer stage, with the approved offer.
- `offers/`: offer letters, offer summaries and emails to candidates, one file each.
- `data/open-roles.json`: the open roles, read by the careers site.
- `scripts/check_docs.py`: checks the Markdown documents; its tests are in `tests/`.
- `CHANGELOG.md`: one line per change, newest first.

## Writing an offer

Copy `people/templates/offer-letter.md` into `offers/`, name the file after the role, and replace
every `{{placeholder}}` with the figures approved in the candidate's file. Emails to candidates
also go in `offers/`: a level-1 heading naming the email, then `To:` and `Subject:` lines, then
the body.

## Checks

```sh
python3 scripts/check_docs.py
python3 -m pytest
```

Every document in `people/`, `hiring/` and `offers/` starts with a level-1 heading and keeps its
lines to 100 characters, and an offer in `offers/` has no `{{placeholder}}` left in it.

Questions go to #people-ops on Slack or to Rosa Delgado, Head of People.
