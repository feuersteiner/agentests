# copperleaf-api

The backend of Copperleaf, a small writing community: members sign up, write posts and read each
other's work. TypeScript on Node 22, with Prisma on PostgreSQL.

## Layout

- `prisma/schema.prisma`: the data model.
- `prisma/migrations/`: one folder per migration, each holding the `migration.sql` that Prisma
  generated for a change to the schema.
- `src/db.ts`: the shared Prisma client.
- `src/posts.ts`, `src/users.ts`: creating, publishing and listing posts; sign-up and profiles.
- `src/serialize.ts`: turns database rows into the JSON the API returns.
- `src/lib/`: small helpers for slugs, pagination and email addresses.
- `test/`: unit tests for `src/lib/` and `src/serialize.ts`.

## Scripts

- `bun test` runs the unit tests. They need no database.
- `npm run db:migrate -- --name <what-changed>` creates and applies a migration after a schema
  change. It needs a local PostgreSQL and `DATABASE_URL`.
- `npm run db:generate` regenerates the Prisma client.

## Models

| Model  | What it holds                                                  |
| ------ | -------------------------------------------------------------- |
| `User` | A member: email address, display name, optional bio, join date |
| `Post` | A member's post: title, slug, body and when it was published   |

## API conventions

- List endpoints take `page` (from 1) and `limit` (default 20, at most 100).
- Responses send ids as strings and dates as ISO 8601 strings.
- A member's email address is never returned to other members.
