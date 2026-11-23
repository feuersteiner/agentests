# Rubric: ids on growing tables are 64-bit

## The rule

Primary keys, and the foreign keys that reference them, on tables that grow with usage (events, logs, messages, line items, notifications) must use 64-bit integers or UUIDs, never 32-bit integer or serial types.

- The database is PostgreSQL, behind Prisma. In a Prisma schema, `Int` is PostgreSQL's 32-bit `integer`, and an `Int` id with `@default(autoincrement())` is a `serial`; `BigInt` is the 64-bit `bigint` (a `bigserial` with `autoincrement()`), and a UUID key is a `String` with `@default(uuid())`, usually stored as `@db.Uuid`. In SQL, `integer`, `int`, `serial` and `smallint` are 32 bits or fewer; `bigint`, `bigserial` and `uuid` meet the rule.
- A foreign key has the same type as the key it references, so a column that points at a `BigInt` key is a `BigInt` too, whether or not it is declared as a relation.
- A table grows with usage when ordinary use of the product adds rows to it, such as a row for each sign-up, post, action, request or message. A short list of values the team maintains by hand, such as plans or countries, does not.

## What to look at

Before the task, the repository's `User` and `Post` models already had `BigInt @id @default(autoincrement())` keys (`BIGSERIAL` in the first migration), and `Post.authorId` was a `BigInt`. Every table the task asks for (events, notifications, API request logs, chat messages and reactions) grows with usage.

For each model the diff adds to `prisma/schema.prisma`, and each table a new `migration.sql` creates:

1. **The primary key.** `BigInt @id @default(autoincrement())`, or a `String @id @default(uuid())` (with or without `@db.Uuid`), meets the rule; in SQL, `BIGSERIAL`, `BIGINT` or `UUID`. `Int @id`, `SERIAL`, `INTEGER` or `SMALLINT` breaks it. A composite `@@id([...])` made of foreign keys is judged by those foreign keys.
2. **Every foreign key.** A column that holds another row's id, such as `userId`, `eventId` or `messageId`, has the same type as the key it points at: `BigInt` for `User`, `Post` and any new `BigInt`-keyed table. It counts whether or not it has an `@relation` or a `REFERENCES` clause. `userId Int` beside `User.id BigInt` breaks the rule.
3. **The migration agrees.** If the diff includes migration SQL, its key and foreign key columns follow the rule too; `SERIAL` in the SQL under a `BigInt` model is a break.

Do not ask for more than the rule does. Other integer columns, such as counts, status codes or durations, are not keys and may be `Int`. A small hand-maintained list (allowed reaction kinds, say) may have an `Int` key, and so may the columns that point at it. A missing migration or a TypeScript `number` for an id is not a break of this rule. A random string key such as `cuid()` cannot run out but is neither type the rule names: treat it as a partial break. The task's other steps (the bug fixes, tests, renames, README, changelog and version) count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a new growing table has a 32-bit or serial primary key.
- **4 to 6**: the primary keys are 64-bit or UUIDs but a foreign key is 32-bit, or the schema is right and the migration SQL uses `SERIAL` or `INTEGER` for a key, or one new table is right and another is not, or a key is a `cuid()` string.
- **7 to 9**: every key and foreign key on the new growing tables is 64-bit or a UUID, with a minor lapse (such as a running sequence number on the same table kept as `Int`) or a step of the task missing.
- **10**: every step is done, and every key and foreign key the diff adds, in the schema and in any migration, is 64-bit or a UUID and matches the key it references.

What each looks like:

- **2**: `model Event { id Int @id @default(autoincrement()) userId Int ... }`, or a migration with `"id" SERIAL NOT NULL` and a schema to match.
- **5**: `model Notification { id BigInt @id @default(autoincrement()) userId BigInt eventId Int ... }` while `Event.id` is a `BigInt`; or a `BigInt` model whose hand-written migration says `"id" SERIAL`; or `Message` keyed by `BigInt` while `Reaction` is keyed by `Int @id @default(autoincrement())`.
- **8**: every new key is `BigInt` or a UUID and every foreign key matches, but the README's Models table was not updated, or a per-conversation `seq Int` counter sits beside the key.
- **10**: `id BigInt @id @default(autoincrement())` (or a UUID) on every new model, `userId BigInt` and every other foreign key matching its target, `BIGSERIAL` and `BIGINT` in any migration, and every step of the task done.
