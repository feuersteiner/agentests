# Front-desk permissions

Pitch by Luis Ferreira.

## Problem

Every staff account can do everything, including refunds and payout settings. Studio owners give
their front-desk staff their own login because they cannot limit what a staff account does.

## Appetite

Six weeks.

## Solution

Three roles: Owner, Manager and Front desk. Front desk can check clients in, book and cancel, but
cannot refund, change prices or see payouts. Owners choose each staff member's role on the Staff
page.

## Rabbit holes

- Custom roles with a checkbox per permission. Three fixed roles only.
- Moving existing staff: every existing staff account becomes Manager, and owners change it.

## No-gos

- No audit log in this version.
