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

1. Click the gear icon at the bottom of the navigation rail on the left to open **Settings**.
2. Choose the **Domains** tab along the top.
3. Click **Add domain** in the top right corner, enter the address, for example
   `forms.example.com`, and click **Add**.

## Point the domain at Mapleform

At your DNS provider, add a CNAME record:

| Type  | Name    | Value                      |
| ----- | ------- | -------------------------- |
| CNAME | `forms` | `custom.mapleform.example` |

DNS changes can take up to 48 hours to apply.

## Verify the domain

1. Go back to the **Domains** tab.
2. Click the blue **Check DNS** button on the right of the domain's row.

When the check succeeds, the status changes to **Active** and your published forms use the new
address. If it fails, wait an hour and try again. If it still fails after 48 hours, write to
support@mapleform.example.

## Remove a domain

Click the three dots at the far right of the domain's row and choose **Remove**. Your forms go back
to forms.mapleform.example addresses.
