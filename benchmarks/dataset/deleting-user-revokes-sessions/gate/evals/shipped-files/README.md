# larchwood-api

The HTTP API behind Larchwood, a shared task board for small teams. It runs on
[Bun](https://bun.sh) and has no dependencies. Sessions live in Redis and everything else in
Postgres; in this repository each store has an in-memory stand-in that behaves the same way, so
the tests and `bun run start` need neither.

## Layout

| Path                      | What it holds                                                       |
| ------------------------- | ------------------------------------------------------------------- |
| `src/app.ts`              | Joins the routers into the app, and serves it.                      |
| `src/http.ts`             | The small Express-style router the routes are written with.        |
| `src/redis.ts`            | The Redis client, and the in-memory stand-in.                       |
| `src/auth/sessions.ts`    | Sign-in sessions, in Redis.                                         |
| `src/auth/apiKeys.ts`     | API keys, in the `api_keys` table.                                  |
| `src/auth/middleware.ts`  | `requireUser` and `requireAdmin`.                                   |
| `src/users/repo.ts`       | User records, in the `users` table.                                 |
| `src/boards/repo.ts`      | Boards, in the `boards` table.                                      |
| `src/routes/`             | One router per area: `auth`, `account`, `boards`, `admin`, `scim`.  |
| `test/`                   | The `bun test` suite, with shared helpers in `test/client.ts`.      |

## Endpoints

Request and response bodies are JSON. A signed-in request sends `Authorization: Bearer <token>`
with a session token, or `Authorization: ApiKey <key>` with an API key.

| Request                           | What it does                                            |
| --------------------------------- | ------------------------------------------------------- |
| `POST /auth/signup`               | Creates an account and signs in to it.                  |
| `POST /auth/login`                | Signs in with an email and password.                    |
| `POST /auth/anonymous`            | Signs in without an account (see below).                |
| `POST /auth/link`                 | Links an anonymous user to their real account.          |
| `POST /auth/logout`               | Ends the current session.                               |
| `GET /account`                    | The signed-in user's profile.                           |
| `PATCH /account`                  | Changes the display name.                               |
| `GET /account/api-keys`           | The user's API keys, without their secrets.             |
| `POST /account/api-keys`          | Creates an API key and shows its secret once.           |
| `DELETE /account/api-keys/:id`    | Revokes one API key.                                    |
| `GET`, `POST /boards`             | Lists or creates the user's boards.                     |
| `PATCH`, `DELETE /boards/:id`     | Renames or deletes a board.                             |

### Anonymous users

The "try it first" button on the website calls `POST /auth/anonymous`, which creates an anonymous
user with no email and signs them in, so a visitor can make boards before signing up. When they
then sign in to a real account from the same browser, the app calls `POST /auth/link` with that
account's email and password and switches to the session it returns. The anonymous user and its
boards stay where they are.

### Admin

The support team's back office. Every admin route needs a user whose role is `admin`.

| Request                  | What it does                                                     |
| ------------------------ | ---------------------------------------------------------------- |
| `GET /admin/users?q=`    | Every user, or those whose email or display name contains `q`.   |
| `GET /admin/users/:id`   | One user, with how many boards and live API keys they have.      |

### SCIM

Customers on the Business plan provision their people from their identity provider (Okta, Entra
ID) with SCIM 2.0. The identity provider sends `Authorization: Bearer <SCIM_TOKEN>`. Provisioned
users have no password and sign in with SSO.

| Request                     | What it does                                                    |
| --------------------------- | --------------------------------------------------------------- |
| `GET /scim/v2/Users`        | Lists users; supports `filter=userName eq "..."`, `startIndex` and `count`. |
| `GET /scim/v2/Users/:id`    | One user.                                                       |
| `POST /scim/v2/Users`       | Provisions a user; `userName` is their email.                   |

## Development

```sh
bun test
bun run start   # serves on PORT, 3000 by default
```

Tests live in `test/`, one file per router. Notable changes go in `CHANGELOG.md`, under
`Unreleased`.
