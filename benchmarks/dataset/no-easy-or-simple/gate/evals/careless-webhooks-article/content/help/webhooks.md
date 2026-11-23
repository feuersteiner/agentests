---
title: Set up webhooks
---

# Set up webhooks in minutes

Setting up webhooks in Mapleform is quick and easy. In just six simple steps you can send form
responses straight to your own server, with no hassle.

## Steps

1. Open the form and go to **Settings > Integrations > Webhooks**.
2. Click **Add endpoint** and simply paste your HTTPS endpoint URL.
3. Choose the events you want to receive: `response.created`, `response.updated` or
   `form.published`.
4. Copy the signing secret. It is shown once, so keep it somewhere safe.
5. Verifying requests is straightforward: just compute an HMAC-SHA256 of the raw request body with
   your signing secret and compare it with the `Mapleform-Signature` header.
6. Click **Send test event** and check the delivery log for a 2xx response.

That's it! Your webhook is ready to go.

## Good to know

- Your endpoint must answer with a 2xx status within 10 seconds.
- Failed deliveries are retried 5 times over 24 hours.
- You can easily add up to 5 endpoints per form.
