# Tessellate careers

Job adverts and hiring posts for Tessellate, the shift planning software for warehouses and shops,
from our Amsterdam office. Everything is plain Markdown and is reviewed like code before it goes on
the careers site or LinkedIn.

## Layout

- `hiring/briefs/`: the hiring manager's brief for each role. Internal; never published.
- `hiring/adverts/`: one job advert per role, published on the careers site.
- `hiring/social/`: posts for LinkedIn and our other channels.
- `team/`: notes about the company and the team, for anyone who writes about us.
- `data/open-roles.json`: the roles the careers site lists, with each role's advert.
- `scripts/check_adverts.py`: checks the adverts and the roles list; its tests are in `tests/`.
- `CHANGELOG.md`: one line per change, newest first.

Every advert has these sections, in this order: The role, What you'll do, What you bring, About
the team, How to apply. Lines are at most 100 characters.

## Checks

```sh
python3 scripts/check_adverts.py
python3 -m pytest
```

Questions go to #hiring on Slack or to Femke Bos, People Operations.
