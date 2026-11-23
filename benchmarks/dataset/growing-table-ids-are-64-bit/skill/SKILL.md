---
name: growing-table-ids-are-64-bit
description: Use whenever you add or change a database table, a Prisma model or a migration, such as prisma/schema.prisma, a migration.sql under prisma/migrations/, or any CREATE TABLE, even if the request does not mention ids or types. Covers which column types to give primary keys and the foreign keys that point at them, so that tables which keep growing with usage (events, logs, messages, notifications, line items and the like) never run out of ids.
---

# Ids on growing tables are 64-bit

## The rule

Primary keys, and the foreign keys that reference them, on tables that grow with usage (events, logs, messages, line items, notifications) must use 64-bit integers or UUIDs, never 32-bit integer or serial types.

- The database is PostgreSQL, behind Prisma. In a Prisma schema, `Int` is PostgreSQL's 32-bit `integer`, and an `Int` id with `@default(autoincrement())` is a `serial`; `BigInt` is the 64-bit `bigint` (a `bigserial` with `autoincrement()`), and a UUID key is a `String` with `@default(uuid())`, usually stored as `@db.Uuid`. In SQL, `integer`, `int`, `serial` and `smallint` are 32 bits or fewer; `bigint`, `bigserial` and `uuid` meet the rule.
- A foreign key has the same type as the key it references, so a column that points at a `BigInt` key is a `BigInt` too, whether or not it is declared as a relation.
- A table grows with usage when ordinary use of the product adds rows to it, such as a row for each sign-up, post, action, request or message. A short list of values the team maintains by hand, such as plans or countries, does not.

## Why

A 32-bit integer runs out at 2,147,483,647. A table that gets a row for every click, request or
message can pass that in a few years, and then every insert fails. Basecamp 3 hit exactly this: a
busy activity table had an `integer` id, it ran out, and the app was stuck in read-only mode for
almost five hours while the column was migrated to a big integer. Nothing warns you beforehand:
the schema is valid, the tests pass, and the type looks like every Prisma tutorial.

## How to apply it

- Prisma: `id BigInt @id @default(autoincrement())`, or `id String @id @default(uuid()) @db.Uuid`.
- Prisma foreign keys: give the scalar field the referenced key's type, `userId BigInt` for a
  `BigInt` `User.id`, and the same for a plain id column that has no `@relation`.
- SQL migrations: `BIGSERIAL` or `BIGINT ... GENERATED ALWAYS AS IDENTITY` for the key, `BIGINT`
  for a column that references it, or `UUID` for both.

Common slips:

- Writing `Int @id @default(autoincrement())` out of habit on a new model.
- Making the key `BigInt` but leaving a foreign key, or a loose `userId` column, as `Int`.
- Getting the schema right but writing `SERIAL` or `INTEGER` in a hand-written migration.

Counts, status codes, durations and other columns that are not keys may stay `Int`.

## Example

An order line for a shop, pointing at an order with a `BigInt` key.

Violating:

```prisma
model OrderLine {
  id       Int    @id @default(autoincrement())
  orderId  Int
  order    Order  @relation(fields: [orderId], references: [id])
  sku      String
  quantity Int
}
```

Compliant:

```prisma
model OrderLine {
  id       BigInt @id @default(autoincrement())
  orderId  BigInt
  order    Order  @relation(fields: [orderId], references: [id])
  sku      String
  quantity Int
}
```

## Before you commit

For every model or table in the staged diff that grows with usage, check its primary key, then
every column that holds another row's id, in the Prisma schema and in any migration SQL. Each one
is `BigInt`/`BIGSERIAL`/`BIGINT` or a UUID, and each foreign key has the type of the key it points
at. Fix what fails and check again.
