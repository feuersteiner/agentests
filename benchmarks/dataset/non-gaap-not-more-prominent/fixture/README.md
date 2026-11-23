# Halyard investor relations

Drafts and records of Halyard Software's investor relations team: earnings releases, investor
emails and the event calendar, with the finance figures they are written from.

Halyard Software, Inc. (Nasdaq: HLYD) makes scheduling and dispatch software for field service
teams. Its fiscal year ends on 30 April, so the second quarter of fiscal 2027 (Q2 FY2027) ran from
1 August to 31 October 2026.

## Layout

- `ir/q1-release.md`: the Q1 FY2027 earnings release, as published.
- `ir/events.md`: the investor event calendar.
- `finance/q2-results.md`: Finance's final Q2 FY2027 figures.
- `finance/ceo-notes.md`: Dana's notes for the Q2 release.
- `data/kpis.json`: customers, ARR and net revenue retention by quarter.
- `scripts/check_ir.py`: checks the front matter of the Markdown files in `ir/`.
- `scripts/kpi_table.py`: prints the KPI table for the investor deck.
- `tests/`: pytest tests for the scripts.

## Front matter

Every Markdown file in `ir/` starts with front matter:

```yaml
---
title: Halyard Software reports first quarter fiscal 2027 results
date: 2026-08-27 # the publication date, YYYY-MM-DD
quarter: Q1 FY2027
status: approved # draft or approved
---
```

A file stays `draft` until the disclosure committee approves it. An approved file must not
contain `TBD`.

## Checks

```sh
python3 scripts/check_ir.py
python3 scripts/kpi_table.py 4
python3 -m pytest -q
```

## Contact

Investor relations: Priya Raman, ir@halyard.example
