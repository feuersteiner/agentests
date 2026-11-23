# Changelog

## Unreleased

## 0.6.0

- `POST /keys` refuses a key that is already on any account, with 409.
- `PATCH /admin/users/:id` for admins.

## 0.5.0

- Projects: `GET /projects`, `POST /projects` and `GET /projects/:id`.

## 0.4.0

- SSH keys: `GET /keys`, `POST /keys` and `DELETE /keys/:id`, with SHA256 fingerprints.

## 0.3.0

- First version: sessions, `GET /profile` and `GET /users`.
