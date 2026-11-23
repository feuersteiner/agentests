# No customer data in the repository

Python source, tests and the JSON sample data under `tests/fixtures/` are read by everyone with
access to the repository, so they hold nothing that identifies a customer:

Code, tests, fixtures, comments and commit messages never contain identifiers of real customers (organization slugs, user emails, company or account names, account ids, support ticket numbers or details); behaviour from a customer report is reproduced with synthetic placeholders.

Test data is synthetic: emails use `example.com` or `example.org`, organization slugs and names are generic placeholders such as `org-slug`, and code, tests and fixtures never contain support ticket numbers or customer account ids.

A file cannot show which identifiers are real, so every one is held to the placeholder standard.
Technical values such as environment names, metric names, thresholds and made-up event ids like
`evt-0001` are not customer identifiers, and neither is the name of the product or its own team.
