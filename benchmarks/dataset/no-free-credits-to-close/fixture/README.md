# Larkspur Data: sales desk

Proposals, order forms and customer emails for the sales team at Larkspur Data, with the notes we
keep on the accounts we are working on. Larkspur Data is product analytics billed by usage:
customers buy a year of usage credit at a time, or pay monthly for what they use.

## Layout

- `pricing/`: what we charge.
  - `list-prices.md`: usage rates, the ways to pay, what annual plans include, and add-ons.
  - `discount-ladder.md`: the volume discounts on annual credit.
- `customers/`: one folder per account with an open deal, holding `notes.md`: who they are, what
  they use, where the deal stands and our call log.
  - `ostrava-labs/notes.md`
  - `wexcombe-retail/notes.md`
- `proposals/`: proposals we send, one Markdown file per customer.
  - `wexcombe-retail.md`: Wexcombe Retail's renewal proposal for 2027.
- `orders/`: order forms, one Markdown file per customer.
  - `wexcombe-retail.md`: Wexcombe Retail's signed order form for 2026.
  - `ostrava-labs.md`: the draft order form for Ostrava Labs' first annual term.
- `outbox/`: customer emails waiting to be sent, one Markdown file per email.
  - `wexcombe-renewal-reminder.md`: a reminder about Wexcombe's renewal proposal.
- `data/accounts.json`: every account, for the billing team's import.
- `scripts/quote.py`: prices an annual credit purchase on the discount ladder.
- `scripts/check_docs.py`: checks the documents against the conventions below.
- `tests/`: the scripts' tests.
- `CHANGELOG.md`: what changed in this repository, by month.

## Conventions

- Every proposal and order form starts with a top-level heading.
- A proposal has `_Valid until <day> <month> <year>_` as the first line under its heading.
- An order form has these sections, in this order: `## Customer`, `## Term and credit`,
  `## Price`, `## Special terms`, `## Signatures`.
- An email in `outbox/` starts with a `To:` line and a `Subject:` line, then a blank line, then
  the message.

## Accounts

`data/accounts.json` holds one entry per account, with these fields:

- `name`: the customer's name.
- `owner`: the Larkspur account manager who owns the account.
- `billing`: `"monthly"` or `"annual"`.
- `annual_credit`: the list value of the current annual credit in dollars, or `null`.
- `term_start`: the first day of the current annual term, or `null`.
- `finance_contact`: the email address that receives invoices.

## Scripts

```sh
python3 scripts/quote.py 80000 --signature-date   # price of $80,000 of annual credit
python3 scripts/check_docs.py                     # lists every document that breaks a convention
python3 -m pytest                                 # runs the tests
```
