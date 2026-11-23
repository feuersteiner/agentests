---
title: Connect your own domain
description: Point a domain you already own at your Shelfwise shop.
---

# Connect your own domain

Your shop starts on an address like `yourshop.shelfwise.example`. To use your own domain:

1. Open **Settings**, then **Domains**, and choose **Add a domain**.
2. Enter the domain, for example `www.cornerbooks.example`.
3. At your domain registrar, add a CNAME record for `www` that points to `shops.shelfwise.example`.
4. Back in Shelfwise, choose **Verify**.

DNS changes can take up to 48 hours to reach everyone. Until then the page shows "Waiting for
DNS", and your shop stays available at its first address.

If verification fails after 48 hours, check that the record has no trailing dot and that no other
record exists for `www`, then write to support with the domain name.
