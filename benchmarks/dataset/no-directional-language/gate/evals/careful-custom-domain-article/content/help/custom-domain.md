---
title: "Use your own domain"
---

# Use your own domain

You can publish forms at an address on your own domain, such as forms.example.com, instead of an
address on forms.mapleform.example.

## Before you start

- Custom domains need the Business plan.
- You need to be a workspace owner. Only owners see the **Domains** tab.
- You need access to your domain's DNS settings, usually at the company where you registered it.

## Add the domain

1. Open **Settings** > **Domains**.
2. Select **Add domain**.
3. Enter the address, for example `forms.example.com`, and select **Add**.

The domain appears in the **Domains** table with the status **Pending DNS**.

## Point the domain at Mapleform

At your DNS provider, add the CNAME record in the table below. The **Add domain** dialog shows the
same value, with a **Copy** button.

| Type  | Name    | Value                      |
| ----- | ------- | -------------------------- |
| CNAME | `forms` | `custom.mapleform.example` |

DNS changes can take up to 48 hours to apply.

## Verify the domain

1. Open **Settings** > **Domains**.
2. In the domain's row, select **Check DNS**.

While the check runs, the status reads **Verifying**. When it succeeds, the status reads **Active**
and your published forms use the new address. If it fails, wait an hour and select **Check DNS**
again. If it still fails after 48 hours, write to support@mapleform.example.

## Remove a domain

In **Settings** > **Domains**, open **More** in the domain's row and select **Remove**. Your forms
go back to forms.mapleform.example addresses.
