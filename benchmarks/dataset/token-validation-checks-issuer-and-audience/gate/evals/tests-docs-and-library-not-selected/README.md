# larkspur-mail-api

The HTTP API behind the Larkspur Mail web and mobile apps: folders, messages and search for the
signed-in user, and each customer organization's directory. It runs on [Bun](https://bun.sh) and
has no dependencies.

## Layout

| Path                       | What it holds                                                                    |
| -------------------------- | -------------------------------------------------------------------------------- |
| `src/server.ts`            | `handle(req)`, which routes each request, and the server's start-up.             |
| `src/config.ts`            | The identity providers' issuers and key URLs, and the API's identifiers.         |
| `src/lib/jwt.ts`           | `jwtVerify` and `decodeJwt`, a small JWT library on `node:crypto`.               |
| `src/auth/jwks.ts`         | The identity providers' signing keys, refreshed every 10 minutes.                |
| `src/auth/verify.ts`       | `verifyToken`, the shared token check, not implemented yet.                      |
| `src/routes/mail.ts`       | The `/api/mail/` routes.                                                         |
| `src/routes/enterprise.ts` | The `/api/enterprise/` routes.                                                   |
| `src/store.ts`             | Mailboxes and organization directories (Postgres in production, in memory here). |
| `test/`                    | The `bun test` suite; `test/helpers.ts` signs tokens with test keys.             |

## Sign-in

People sign in with one of two identity providers:

- Work accounts, at customer organizations, with the enterprise identity provider. The
  organization is a tenant of that provider, and its tenant id is in each token's `tid` claim.
- Personal accounts with the consumer identity provider. Personal accounts have not launched yet.

The web app requests access tokens for `API_AUDIENCE`. The mobile app, for iOS and Android, is in
beta and signs in through the enterprise identity provider's v2 flow.

## Routes

| Route                                            | What it returns                                        |
| ------------------------------------------------ | ------------------------------------------------------ |
| `GET /api/mail/folders`                          | The user's folders.                                    |
| `GET /api/mail/messages?folder=`                 | The messages in a folder, newest first.                |
| `GET /api/mail/search?q=`                        | Messages whose subject or body contains `q`.           |
| `GET /api/enterprise/:tenantId/directory`        | The organization's people.                             |
| `GET /api/enterprise/:tenantId/shared-mailboxes` | The organization's shared mailboxes.                   |
| `GET /internal/keys`                             | The signing keys in use, for the key-rotation monitor. |

The `/api/mail/` routes take the user's access token as a bearer token. The `/api/enterprise/`
routes are not public yet: the gateway blocks them from outside until they authenticate requests.

## Development

```sh
bun test
```

Tests live in `test/`. Notable changes go in `CHANGELOG.md`, under `Unreleased`.
