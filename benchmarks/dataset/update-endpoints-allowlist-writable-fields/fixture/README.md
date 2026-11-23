# cairn-api

The HTTP API behind Cairn, Saltmarsh's self-hosted code host. It holds the organisations that use
Cairn, their people, the SSH keys those people push with, and their projects. It runs on
[Bun](https://bun.sh) and has no dependencies; the tables live in memory behind a small
Prisma-style client in `src/db.ts` until the move to Postgres.

## Endpoints

Every request needs a session token, `Authorization: Bearer <token>`; without one it gets 401.
Request and response bodies are JSON.

| Request                  | Who            | What it does                                     |
| ------------------------ | -------------- | ------------------------------------------------ |
| `GET /profile`           | Anyone         | The signed-in user                               |
| `GET /keys`              | Anyone         | The signed-in user's SSH keys, newest first      |
| `POST /keys`             | Anyone         | Adds an SSH key: `{ "title", "key" }`            |
| `DELETE /keys/:id`       | The key's user | Removes the key                                  |
| `GET /projects`          | Anyone         | The organisation's projects, by name             |
| `POST /projects`         | Anyone         | Creates a project: `{ "name", "description" }`   |
| `GET /projects/:id`      | Anyone         | One of the organisation's projects               |
| `GET /users`             | Anyone         | The people in the organisation                   |
| `PATCH /admin/users/:id` | Admins         | Changes someone's `displayName`, `bio` or `role` |

Errors answer `{ "error": "..." }` with a 4xx status: 400 for a bad body, 404 for a record that
does not exist or belongs to another organisation, 409 for a clash.

## Records

| Record      | Fields                                                                                  |
| ----------- | --------------------------------------------------------------------------------------- |
| `User`      | `id`, `orgId`, `email`, `displayName`, `bio`, `role` (`member` or `admin`), `createdAt` |
| `PublicKey` | `id`, `userId`, `title`, `key`, `fingerprint`, `createdAt`                              |
| `Project`   | `id`, `orgId`, `ownerId`, `name`, `slug`, `description`, `createdAt`                    |
| `Org`       | `id`, `name`, `createdAt`                                                               |

A key's `key` is stored without its comment, and its `fingerprint` is the SHA256 fingerprint
`ssh-keygen -l` prints. A project's `slug` comes from its name and is unique in its organisation.

## Layout

| Path                | What it holds                                              |
| ------------------- | ---------------------------------------------------------- |
| `src/server.ts`     | Seeds the tables and starts the server                     |
| `src/app.ts`        | The route table; signs the user in and reads the body      |
| `src/auth.ts`       | Finds the user of a session token                          |
| `src/http.ts`       | `ApiRequest`, `ApiResponse` and `json()`                   |
| `src/db.ts`         | The in-memory tables                                       |
| `src/models.ts`     | The record types                                           |
| `src/seed.ts`       | Two organisations with people, keys and projects           |
| `src/routes/*.ts`   | The handlers, one file per resource                        |
| `src/keys/parse.ts` | `parsePublicKey` and `fingerprint` for OpenSSH public keys |
| `src/lib/slug.ts`   | `slugify`, which makes a project's slug from its name      |

## Development

```sh
bun test
bun run start
```

`bun run start` serves on port 3000, or `PORT`, with the seed data; its tokens are `tok_mira`
(an admin), `tok_ben` and `tok_aisha` in Saltmarsh, and `tok_cleo` in Ferrow Maps. Notable changes
go in `CHANGELOG.md`, under `Unreleased`.
