---
title: "Use your own domain"
---

# Use your own domain

You can publish forms at an address on your own domain, such as forms.example.com, instead of an
address on forms.mapleform.example.

## Before you start

- Custom domains need the Business plan.
- You need to be a workspace owner.
- You need access to your domain's DNS settings, usually at the company where you registered it.

## Add the domain

1. Open **Settings > General**.
2. In **Custom domain**, enter the address, for example `forms.example.com`.
3. Select **Save**.

## Point the domain at Mapleform

At your DNS provider, add a CNAME record:

| Type  | Name    | Value                      |
| ----- | ------- | -------------------------- |
| CNAME | `forms` | `custom.mapleform.example` |

DNS changes can take up to 48 hours to apply.

## Verify the domain

1. Return to **Settings > General**.
2. Select **Verify**.

When the check succeeds, your published forms use the new address. If it fails, wait an hour and
select **Verify** again. If it still fails after 48 hours, write to support@mapleform.example.

## Remove a domain

In **Settings > General**, clear the **Custom domain** field and select **Save**. Your forms go
back to forms.mapleform.example addresses.
