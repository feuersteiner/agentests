# Changelog

## Unreleased

## 2.6.0

- SCIM: `GET /scim/v2/Users` supports `startIndex` and `count`.
- `GET /admin/users/:id` shows how many live API keys the user has.

## 2.5.0

- Added API keys: `GET`, `POST /account/api-keys` and `DELETE /account/api-keys/:id`.

## 2.4.0

- Added anonymous users: `POST /auth/anonymous` and `POST /auth/link`.
