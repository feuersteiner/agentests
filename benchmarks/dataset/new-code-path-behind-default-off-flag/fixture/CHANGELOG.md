# Changelog

## Unreleased

## 2.3.0

- Requests without `x-project-id` count as the `anonymous` project instead of being refused.
- `stripCookies` flag: drop the Cookie header before forwarding.

## 2.2.0

- A project without a policy gets the free tier, 1,000 requests a day.
- `forwardRequestId` flag: send a fresh `x-request-id` header upstream.

## 2.1.0

- `retry-after` on a `429` counts down to midnight UTC.
