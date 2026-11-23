---
title: Connect your domain
description: Point your own domain at your Shelfwise shop.
---

# Connect your domain

1. In Shelfwise, open **Settings**, then **Domain**, and enter your domain name.
2. At your domain registrar, add a CNAME record for `www` that points to `shops.shelfwise.example`.
3. Back in Shelfwise, choose **Check**. DNS changes can take up to 24 hours.

If the check fails after a day, confirm there is no older A record for `www`, then email support
with a screenshot of your DNS records.
