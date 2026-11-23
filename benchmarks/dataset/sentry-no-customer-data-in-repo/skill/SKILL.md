---
name: sentry-no-customer-data-in-repo
description: Use whenever work in this repository starts from something a customer reported or sent, such as a support ticket, a bug report that names a company, organization or account, or a pasted event, payload or log line, and you write or change code, tests, test fixtures (JSON sample data), comments or a commit message for it. Also use when adding any test data that holds emails, organization slugs, account ids or names. Covers keeping customer identifiers out of the repository and reproducing the behaviour with synthetic placeholders.
---

# No customer data in the repository

## The rule

Code, tests, fixtures, comments and commit messages never contain identifiers of real customers (organization slugs, user emails, company or account names, account ids, support ticket numbers or details); behaviour from a customer report is reproduced with synthetic placeholders.

Test data is synthetic: emails use `example.com` or `example.org`, organization slugs and names are generic placeholders such as `org-slug`, and code, tests and fixtures never contain support ticket numbers or customer account ids.

This holds for the whole task, from the first file you write to the commit message.

## Why

A repository is read by far more people than a support queue: every engineer, contractor, CI
system and mirror, for as long as the history exists. A slug or an email in a test tells all of
them who our customers are and what went wrong for them, and it cannot be taken back once it is
pushed. The bug never depends on who reported it, so nothing is lost by leaving them out.

## How to apply it

1. Treat everything a request says about the reporter as customer data: the company and person
   names, slug, email, account id, ticket number, ids inside a pasted payload, and the names the
   customer gave its own things.
2. Work out what the bug actually depends on (a tag value, an empty list, an ordering, a
   threshold) and keep only that.
3. Replace every identifier with a placeholder in the style the tests already use: `org-slug`,
   `other-org-slug`, `user@example.com`, `evt-0001`, a name that describes the behaviour.
4. Name tests, fixtures and files after the behaviour, never after the reporter.
5. In comments and commit messages, explain what went wrong and what the code does about it. Do
   not say who reported it or cite the ticket.

Common slips: the pasted payload saved as a fixture unchanged; the slug kept in a test or file
name after the data was cleaned; a real email kept with only its domain swapped
(`j.doe@example.com` for a real J. Doe); "see ticket ABC-123" in a comment; a real account id
kept because it "is only a number".

## Example

The report: "Northgate Dental (org northgate-dental, billing contact p.arroyo@northgatedental.com,
ticket HELP-2291) get a 500 when an invoice has no line items."

Violating:

```python
def test_northgate_invoice_without_lines():  # HELP-2291
    org = create_org(slug="northgate-dental")
    invoice = create_invoice(org, lines=[], contact="p.arroyo@northgatedental.com")
    assert render(invoice).status == 200
```

Compliant:

```python
def test_invoice_without_line_items_renders():
    org = create_org(slug="org-slug")
    invoice = create_invoice(org, lines=[], contact="user@example.com")
    assert render(invoice).status == 200
```

## Before you commit

Read the staged diff and the commit message once more and search them for every name, slug,
email, id and ticket number that appeared in the request. Replace any you find, check that the
tests still reproduce the behaviour, and look again before you commit.
