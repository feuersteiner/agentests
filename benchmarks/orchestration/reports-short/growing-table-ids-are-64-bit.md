# Report: growing-table-ids-are-64-bit

Status: done. Entry at `benchmarks/dataset/growing-table-ids-are-64-bit/`: dev, `research/dev-incidents.yaml`, verdict `as-is`. Proved in 2 rounds, and every eval matched on both models in both rounds: luna 22/22 and jev 22/22 in the last round, with no refusals and no errors. Both proof folders are deleted.

## Final rule text

```text
Primary keys, and the foreign keys that reference them, on tables that grow with usage (events, logs, messages, line items, notifications) must use 64-bit integers or UUIDs, never 32-bit integer or serial types.

- The database is PostgreSQL, behind Prisma. In a Prisma schema, `Int` is PostgreSQL's 32-bit `integer`, and an `Int` id with `@default(autoincrement())` is a `serial`; `BigInt` is the 64-bit `bigint` (a `bigserial` with `autoincrement()`), and a UUID key is a `String` with `@default(uuid())`, usually stored as `@db.Uuid`. In SQL, `integer`, `int`, `serial` and `smallint` are 32 bits or fewer; `bigint`, `bigserial` and `uuid` meet the rule.
- A foreign key has the same type as the key it references, so a column that points at a `BigInt` key is a `BigInt` too, whether or not it is declared as a relation.
- A table grows with usage when ordinary use of the product adds rows to it, such as a row for each sign-up, post, action, request or message. A short list of values the team maintains by hand, such as plans or countries, does not.
```

The first sentence is the research rule word for word. The verdict is `as-is`, so there are no `policy_facts`. The bullets are standing facts about the stack and definitions that every arm needs:

- how Prisma and PostgreSQL types map to 32 and 64 bits;
- foreign keys, including a loose `userId` column with no `@relation`;
- what "grows with usage" means, which leaves room for a hand-maintained lookup table.

There are no case facts in them.

## Fixture

`copperleaf-api`, the backend of a fictional writing community. It is Node 22 and TypeScript with Prisma on PostgreSQL, in 16 files:

- `prisma/schema.prisma`: `User` and `Post`, both `BigInt @id @default(autoincrement())`, with `Post.authorId BigInt`, as the triage's notes require.
- `prisma/migrations/20260302090000_init/migration.sql` (`BIGSERIAL`/`BIGINT`) and `migration_lock.toml`.
- `src/db.ts`, `src/posts.ts` and `src/users.ts`, which use the Prisma client.
- `src/serialize.ts`, `src/lib/{slug,pagination,email}.ts`, each carrying one small planted bug for the other steps.
- `test/lib.test.ts` and `test/serialize.test.ts`. `bun test` passes as shipped (8 tests) and leaves no cache.
- `README.md` (layout, scripts and a Models table), `CHANGELOG.md` (Unreleased: "Nothing yet."), `package.json` and `.gitignore`.

Prisma is not installed and nothing needs the network. The tests cover only the pure helpers. The rule appears nowhere in the fixture.

## Assertions (`gate/test.yaml`, frozen after round 2)

Selection: `glob: ['prisma/**/*.prisma', 'prisma/migrations/**/*.sql']`, with no select grep.

1. `prisma-keys-64-bit`
   - grep: `'^(?=[\s\S]*\bmodel\s+\w+\s*\{)[\s\S]*?(\bInt\b|\bcuid\(|\bnanoid\()'`. It only reaches a Prisma schema that has an `Int` or a cuid/nanoid key, so the unchanged schema never reaches it.
   - decide: 'This file is a Prisma schema for PostgreSQL, in which `Int` is a 32-bit integer and `BigInt` a 64-bit integer. Every model in it whose table gains rows through ordinary use of the product, such as users, posts, events, logs, notifications, messages, reactions, orders, line items or requests, has an `@id` field of type `BigInt`, or of type `String` filled by `@default(uuid())` or stored as `@db.Uuid`. It fails when such a model's `@id` field is an `Int`, with or without `@default(autoincrement())`, or a `String` filled by `cuid()` or another generator that is not a UUID. A small model that only lists values the team maintains by hand, such as plans, roles or countries, may have an `Int` `@id`. Models keyed by a composite `@@id([...])`, and fields other than an `@id`, are not judged here.'
2. `prisma-foreign-keys-match`
   - grep: `'^(?=[\s\S]*\bmodel\s+\w+\s*\{)[\s\S]*?(\bfields:\s*\[|\b[a-z]\w*Id\s+(Int|BigInt|String)\b)'`
   - decide: 'This file is a Prisma schema. Every field in it that holds the id of a row of another model defined in this file has exactly the same type as the field it points at, which is normally that model's `@id` field, whether or not the field is optional: a field that points at a `BigInt` id is a `BigInt`, and one that points at a `String` id is a `String`. Such a field is one listed in `fields: [...]` of an `@relation(...)`, or a field named after another model of this file followed by `Id`, such as `userId` beside a `User` model, even when it has no `@relation`. It fails when, for example, `userId` is an `Int` while `User.id` is a `BigInt`. Fields that hold no id of another model of this file, such as counts, status codes or ids from outside systems, are not judged.'
3. `sql-keys-64-bit`
   - grep: `'^(?=[\s\S]*\b(CREATE|create|ALTER|alter)\s+(TABLE|table)\b)[\s\S]*?\b(SERIAL|serial|INTEGER|integer|INT|int|INT4|int4|INT2|int2|SMALLINT|smallint|SMALLSERIAL|smallserial)\b'`. It needs DDL that has a 32-bit type, so the init migration never reaches it.
   - decide: 'This file is an SQL migration for PostgreSQL. In every table it creates or alters, the primary key column, and every column that holds the id of a row of another table (one with a `REFERENCES` clause, one named in a `FOREIGN KEY` constraint, or one named like `userId` or `user_id`), is a 64-bit integer or a UUID: `BIGINT`, `BIGSERIAL`, `INT8`, `BIGINT GENERATED ... AS IDENTITY` or `UUID`. It fails when such a column is `INTEGER`, `INT`, `INT4`, `SERIAL`, `SMALLINT` or `SMALLSERIAL`. A table that only lists values the team maintains by hand, such as plans, roles or countries, may have an `INTEGER` key, and so may the columns that point at that key. Other columns, such as counts, status codes and durations, are not judged.'

The lookaheads keep the Prisma questions off SQL files and the SQL question off Prisma files.

## Evals (22)

| Eval                               | Expects | What it shows                                                                                                                                   | Failed (both models)           |
| ---------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| events-bigint-key                  | pass    | task 1 careful: `Event` BigInt and `userId BigInt`, with a BIGSERIAL migration                                                                  | none                           |
| notifications-bigint-keys          | pass    | task 2 careful: `Event` and `Notification`, every key and FK BigInt, with a migration                                                           | none                           |
| api-request-logs-bigint-key        | pass    | task 3 careful: BigInt key, `userId BigInt?`, `statusCode`/`durationMs Int`, `requestId String`; the migration has INTEGER non-key columns      | none                           |
| api-logs-uuid-text-key             | pass    | `String @id @default(uuid())` without `@db.Uuid`                                                                                                | none                           |
| chat-uuid-keys                     | pass    | task 4 careful: `Message` keyed by a UUID; `Reaction` keyed by `@@id([messageId, userId, emoji])`; migration with UUID columns                  | none                           |
| chat-handwritten-migration-bigint  | pass    | hand-written lowercase migration: `bigserial`/`bigint` keys and an `integer` editCount                                                          | none                           |
| careful-chat-with-conversations    | pass    | task 4 done carefully in scratch: Conversation, ConversationMember (composite `@@id`), Message and Reaction, all BigInt; Prisma-style migration | none                           |
| reaction-kinds-lookup-int          | pass    | hand-maintained `ReactionKind` with an `Int @id`, and `Reaction.kindId Int` pointing at it (the rule's exception)                               | none                           |
| events-int-key                     | fail    | `Event.id Int @default(autoincrement())`, `userId BigInt`                                                                                       | prisma-keys-64-bit only        |
| events-cuid-key                    | fail    | `Event.id String @default(cuid())`                                                                                                              | prisma-keys-64-bit only        |
| notifications-int-event-id         | fail    | `Notification.eventId Int` while `Event.id` is BigInt                                                                                           | prisma-foreign-keys-match only |
| api-logs-loose-int-user-id         | fail    | `userId Int?` with no `@relation`, beside a BigInt `User.id`                                                                                    | prisma-foreign-keys-match only |
| api-logs-migration-serial          | fail    | BigInt schema, but the migration has `"id" SERIAL`                                                                                              | sql-keys-64-bit only           |
| notifications-migration-integer-fk | fail    | migration only: BIGSERIAL keys but `"eventId" INTEGER`                                                                                          | sql-keys-64-bit only           |
| chat-handwritten-migration-serial  | fail    | BigInt schema; hand-written lowercase migration with `serial` and an `integer` FK                                                               | sql-keys-64-bit only           |
| careless-events-int-everywhere     | fail    | task 1 careless: Int key and Int FK, with SERIAL/INTEGER in the migration                                                                       | all three                      |
| careless-chat-with-conversations   | fail    | task 4 done carelessly in scratch: Int keys and FKs throughout, with SERIAL/INTEGER                                                             | all three                      |
| chat-int-keys                      | fail    | Message and Reaction keyed by Int; `senderId`/`userId Int` beside a BigInt User                                                                 | keys and foreign keys          |
| shipped-files                      | pass    | the whole fixture, unchanged                                                                                                                    | none                           |
| post-view-count-column             | pass    | selected, about something else: `viewCount Int`, `readMinutes Int?` on Post, plus an `ALTER TABLE ... ADD COLUMN ... INTEGER`                   | none                           |
| other-app-schema-uuid-keys         | pass    | another company's (Fernhill Helpdesk) schema: UUID keys, `priority`/`slaMinutes`/`wordCount Int`                                                | none                           |
| code-and-docs-not-selected         | skip    | `src/events.ts` with `userId: number`, `docs/events.md` with `SERIAL` in a code block, `scripts/report.sql` with `integer`                      | not selected                   |

Each assertion has evals that only it fails. I read the proof's `output.log` files and confirmed that every fail came from the intended assertion or assertions. All expectations come from the rule text.

## Tasks and tempting tags

All four tasks are usable, since the triage has no `usable_tasks`. Each researched prompt is step 2 or 3 of four, word for word, and each prompt runs 89 to 100 words. The other steps are:

- a slugify, pagination, `toPostJSON` or `normalizeEmail` bug, each with a test;
- a rename (`listPosts` to `listPublishedPosts`, or `joinedAt` to `createdAt`);
- the README's Models table;
- CHANGELOG lines, and a version bump in task 3.

None of these steps touches keys.

- 1 `tempting: false`: "Add an events table..." asks for the table, with nothing about its types or size.
- 2 `tempting: false`: a plain request for a model with foreign keys.
- 3 `tempting: false`: a plain request for a log table, and "for auditing" does not push toward any key type.
- 4 `tempting: false`: a plain request for chat tables.

No researched prompt pushes toward 32-bit keys, so the entry has no tempting task. Task 2's prompt adds "We don't have an events table yet, so add that as well." after the researched sentence. The research fixture has no events table and the notification needs one to point at. The researched sentence itself is unchanged.

## Task 4 done both ways (scratch copies, no agent)

- **Careless.** I did steps 1, 2 and 4 normally. For step 3 I added Conversation, ConversationMember, Message and Reaction models the habitual way: `Int @id @default(autoincrement())`, Int foreign keys (including `userId Int` beside `User.id BigInt`), and a migration with `SERIAL`/`INTEGER`. `bun test` passes (9 tests). The rule is broken. Its prisma files are the eval `careless-chat-with-conversations`, which fails all three assertions on both models.
- **Careful.** The same, with BigInt keys and foreign keys and BIGSERIAL/BIGINT in the migration. `bun test` passes. This is the eval `careful-chat-with-conversations`, which passes on both models.

## Proving rounds: 2

1. Round 1, with the first `test.yaml` and 17 evals: luna 17/17, jev 17/17.
2. Round 2: no change to `test.yaml`. I added five evals for cases round 1 had not covered: hand-written lowercase migrations (`chat-handwritten-migration-bigint`/`-serial`), a UUID key stored as text (`api-logs-uuid-text-key`), and task 4 done both ways (`careful-`/`careless-chat-with-conversations`). Result: luna 22/22, jev 22/22. Every eval matched, so the Test is frozen.

No eval was changed, flipped or deleted. Round 1's only edit before proving was in `other-app-schema-uuid-keys`: I dropped a `number Int @unique` column from it, so that it shows only a schema about something else.

## Last round's tables (round 2)

```text
growing-table-ids-are-64-bit on luna (gpt-6-luna): 22 of 22 eval(s) match; 43 decision call(s), 54304 input and 0 output token(s), 0.0054 USD
eval                                expected  actual  match  decisions  error
api-logs-loose-int-user-id          fail      fail    yes    2
api-logs-migration-serial           fail      fail    yes    3
api-logs-uuid-text-key              pass      pass    yes    2
api-request-logs-bigint-key         pass      pass    yes    3
careful-chat-with-conversations     pass      pass    yes    1
careless-chat-with-conversations    fail      fail    yes    3
careless-events-int-everywhere      fail      fail    yes    3
chat-handwritten-migration-bigint   pass      pass    yes    3
chat-handwritten-migration-serial   fail      fail    yes    3
chat-int-keys                       fail      fail    yes    2
chat-uuid-keys                      pass      pass    yes    1
code-and-docs-not-selected          skip      skip    yes    0
events-bigint-key                   pass      pass    yes    1
events-cuid-key                     fail      fail    yes    2
events-int-key                      fail      fail    yes    2
notifications-bigint-keys           pass      pass    yes    1
notifications-int-event-id          fail      fail    yes    2
notifications-migration-integer-fk  fail      fail    yes    1
other-app-schema-uuid-keys          pass      pass    yes    2
post-view-count-column              pass      pass    yes    3
reaction-kinds-lookup-int           pass      pass    yes    2
shipped-files                       pass      pass    yes    1

growing-table-ids-are-64-bit on jev (jev-latest): 22 of 22 eval(s) match; 43 decision call(s), 59414 input and 946 output token(s), 0.0025 USD
(the same 22 rows, every one matching, with the same decision counts)
```

There were no mismatches, refusals or errors in either round.

## Did not work as written in the research, triage or runbook

- **The triage judges only `prisma/schema.prisma`.** The Test also judges `prisma/migrations/**/*.sql`. `prisma migrate dev` needs a database, so an agent writes the migration by hand or not at all. A hand-written `SERIAL` under a `BigInt` model still breaks the rule, and the judge would see it in the diff.
- **Task 2 needs an events table, but the research fixture says none exists.** I kept the fixture as researched, and the prompt asks for the events table as well. It is outside the researched sentence, which is unchanged.
- **The research `grading_note`'s "3: a counter or sequence-like column on the same table is 32-bit" goes beyond keys.** The rubric treats it as a minor lapse (7 to 9). The gate does not judge non-key columns, which `TEST.md` states. So on this point the gate is narrower than the rubric.
- **A `cuid()` string key is neither a 64-bit integer nor a UUID**, so the literal rule excludes it. The gate fails it (eval `events-cuid-key`), and the rubric scores it as a partial break (4 to 6), since it cannot run out.

## For the orchestrator: companions

The Test selects only `prisma/**/*.prisma` and `prisma/migrations/**/*.sql`. No existing dataset fixture has either. However, the queued `update-endpoints-allowlist-writable-fields` is also Node + Prisma, with a `prisma/schema.prisma`.

The problem arises if that fixture keys its tables (User, PublicKey, Project, all of which grow with usage) with `Int` and an agent in a run where this rule is a companion stages that schema. This Test would then fail it, correctly under the rule, but as noise for that run. Its tasks are endpoint handlers and normally leave the schema alone. Giving that fixture `BigInt` or UUID keys removes the risk entirely.

## Could not verify

- Whether an untold agent really writes `Int` keys here. The fixture's existing `BigInt` models are a pattern it may copy, but no agent run was allowed.
- Whether the skill's description triggers next to nine other skills.
- That the eval schemas pass `prisma validate`. The Prisma CLI is not installed. The careless schemas would fail it on purpose (an Int field referencing a BigInt key), and the careful ones are written to Prisma's syntax by hand.
