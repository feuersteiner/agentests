# Changelog

## Unreleased

## 0.4.0

- Send an `invoice.created` webhook when the job names a webhook URL.
- Sign webhook bodies with HMAC-SHA256.

## 0.3.0

- Send the job id to the billing API as the idempotency key.
- Log the invoice id and amount of every processed job.

## 0.2.0

- Save every invoice to the `invoices` table.
