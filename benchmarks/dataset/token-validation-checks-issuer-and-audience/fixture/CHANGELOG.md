# Changelog

## Unreleased

## 0.8.0

- `GET /api/mail/search` searches the subject and body of messages in every folder.
- `GET /api/enterprise/:tenantId/shared-mailboxes` lists an organization's shared mailboxes.

## 0.7.0

- The identity providers' signing keys are refreshed every 10 minutes instead of at start only.
- Message lists show a preview of each message's body.

## 0.6.0

- Added `GET /api/enterprise/:tenantId/directory`.
