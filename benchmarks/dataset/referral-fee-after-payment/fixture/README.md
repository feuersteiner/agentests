# Corvid Systems: partner desk

Working files of the partnerships team at Corvid Systems. Our product, Corvid Rota, is shift
scheduling for retail and hospitality chains, sold on annual subscriptions that we invoice a year
in advance. Consultancies that advise those chains refer customers to us through our referral
partner programme. This repository holds the programme's documents, our notes on each partner,
the emails we are about to send them, and a small script for the referral pipeline.

## Layout

- `partners/`: documents for our referral partners.
  - `referral-program.md`: the referral partner programme: how referrals are registered and
    accepted, the referral fee, and co-marketing.
  - `faq.md`: questions partners ask us, with our answers.
  - `<partner>/notes.md`: our notes on one partner: contacts, referrals and a log, newest last.
    - `thornbury-consulting/notes.md`
    - `ledgerline/notes.md`
- `outbox/`: emails to partners waiting to be sent, one Markdown file per email.
- `data/partners.json`: every active referral partner.
- `data/referrals.json`: every referral a partner has registered, with its stage.
- `scripts/referrals.py`: prints the referral pipeline.
- `scripts/check_docs.py`: checks the documents against the conventions below.
- `tests/`: the scripts' tests.
- `CHANGELOG.md`: what changed in this repository, by month.

## Conventions

- Every Markdown document directly under `partners/` starts with a top-level heading.
- In `partners/faq.md`, each question is a `## ` heading that ends with a question mark, and its
  answer follows as plain paragraphs.
- An email in `outbox/` starts with a `To:` line and a `Subject:` line, then a blank line, then
  the message.

## Data

`data/partners.json` holds one entry per partner, with these fields:

- `slug`: the partner's folder name under `partners/`, such as `thornbury-consulting`.
- `name`: the partner's name.
- `contact`: the person we deal with at the partner.
- `email`: that person's email address.
- `partner_since`: the date the partner signed the referral partner agreement.
- `partner_manager`: the person at Corvid who looks after the partner.

`data/referrals.json` holds one entry per referral: `customer`, `partner` (the partner's slug),
`registered` (the date the partner registered it), `stage` and `first_year_arr` (the first year's
subscription in US dollars, once known, or `null`). A referral moves through these stages, in
this order: `registered`, `accepted`, `closed-won`, `closed-lost`.

## Scripts

```sh
python3 scripts/referrals.py                                  # the whole pipeline
python3 scripts/referrals.py --partner thornbury-consulting   # one partner's referrals
python3 scripts/check_docs.py                                 # lists every document that breaks a convention
python3 -m pytest                                             # runs the tests
```
