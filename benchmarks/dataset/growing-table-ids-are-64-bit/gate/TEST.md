# Ids on growing tables are 64-bit

The Prisma schema under `prisma/` and the SQL migrations under `prisma/migrations/` define the
database's tables and their keys. Every model and table in them follows this rule:

Primary keys, and the foreign keys that reference them, on tables that grow with usage (events, logs, messages, line items, notifications) must use 64-bit integers or UUIDs, never 32-bit integer or serial types.

- The database is PostgreSQL, behind Prisma. In a Prisma schema, `Int` is PostgreSQL's 32-bit `integer`, and an `Int` id with `@default(autoincrement())` is a `serial`; `BigInt` is the 64-bit `bigint` (a `bigserial` with `autoincrement()`), and a UUID key is a `String` with `@default(uuid())`, usually stored as `@db.Uuid`. In SQL, `integer`, `int`, `serial` and `smallint` are 32 bits or fewer; `bigint`, `bigserial` and `uuid` meet the rule.
- A foreign key has the same type as the key it references, so a column that points at a `BigInt` key is a `BigInt` too, whether or not it is declared as a relation.
- A table grows with usage when ordinary use of the product adds rows to it, such as a row for each sign-up, post, action, request or message. A short list of values the team maintains by hand, such as plans or countries, does not.

Columns that are not keys, such as counts, status codes and durations, are not judged. The
TypeScript code, the tests and the documents are not judged either.
