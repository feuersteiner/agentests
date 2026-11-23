# sorrel-lists

The backend of Sorrel, a shared shopping and to-do list app. It holds accounts, sessions and lists,
serves the web app's sign-in, and serves the JSON API that the web and mobile apps read lists
through. It runs on [Bun](https://bun.sh) and has no dependencies.

## Layout

| Path                   | What it holds                                                          |
| ---------------------- | ---------------------------------------------------------------------- |
| `src/server.ts`        | The routing table and the Bun server.                                  |
| `src/http.ts`          | The `Route` type and small request and response helpers.               |
| `src/routes/web.ts`    | The web app's `POST /login` and `POST /logout`, with a session cookie. |
| `src/routes/api.ts`    | The JSON API, served under `/api`.                                     |
| `src/auth/password.ts` | `hashPassword` and `verifyPassword` (argon2id).                        |
| `src/auth/sessions.ts` | Sessions: create, find and revoke.                                     |
| `src/db/users.ts`      | Accounts (Postgres in production, in memory here).                     |
| `src/db/lists.ts`      | Lists and their items.                                                 |
| `test/`                | The `bun test` suite.                                                  |

## Accounts

An account has an email, a name, and either a password or a single sign-on provider. People who
sign up with Google or Okta sign in through the identity gateway in front of this service; their
accounts have `ssoProvider` set and `passwordHash: null`. The support console sets `disabled` on
closed or suspended accounts, and the API stops accepting their sessions.

## API

Each route takes the session as `Authorization: Bearer <token>` or as the web app's
`sorrel_session` cookie. The mobile app, in beta, signs in through a web view of the web sign-in
for now.

| Route              | What it does                                         |
| ------------------ | ---------------------------------------------------- |
| `GET /api/me`      | The signed-in account's id, name and email.          |
| `GET /api/lists`   | The account's lists, with each list's item count.    |
| `POST /api/lists`  | Creates a list from `{ "title": "..." }`.            |

## Development

```sh
bun test
bun start   # listens on PORT, 3000 by default
```

Tests live in `test/`. Notable changes go in `CHANGELOG.md`, under `Unreleased`.

## Signing in

`POST /login` takes `{ "email": "...", "password": "..." }`. An SSO-only account is told to use
its provider: `{ "error": "This account signs in with Google." }`.
