# api-responses-use-explicit-field-projection: report

Entry: `benchmarks/dataset/api-responses-use-explicit-field-projection/` (domain `dev`, research
`research/dev-incidents.yaml`, verdict `restate-policy`, tasks 1, 3 and 4 as the triage's
`usable_tasks` says). Status: done. Five proving rounds; the gate is frozen at round 5.

## Final rule text

```
API responses must be built from an explicit list of fields meant for that audience (a DTO, view model or serializer), never by returning the ORM model or database row, so sensitive or newly added columns are not exposed by default.

- In marginalia, the structs of `internal/model` are the database rows, and the store's methods return them. `model.Comment` carries `Email` and `IPHash`, and `model.User` carries `PasswordHash`, `Email` and `Role`.
- None of those fields is ever in a response of the router's public group, whose routes are unauthenticated.
```

It is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and nowhere in `fixture/`.
`TEST.md` adds one paragraph for the compiler: what counts as a listed-field response, that the
handlers outside the public group are the editors' moderation handlers named `Admin…` (they may show
a commenter's email), and that test files are not judged.

## Fixture

marginalia, the API behind Field Notes, the blog of Corvid & Finch (a fictional birding
magazine). It is Go 1.22, standard library only, 15 files: `cmd/server/main.go` (env config, seed,
server), `internal/model/{user,comment,post}.go` (rows with json tags; `IPHash` and `PasswordHash`
are tagged `json:"-"`, `Email` and `Role` are not, as in the advisory), `internal/store/store.go` (an
in-memory store whose methods return model rows) with `store_test.go`,
`internal/handler/{handler,post,comment,admin}.go`, where every handler already sends a response
struct of its own, with `handler_test.go`, and `internal/router/router.go` with a `public` and an
`admin` route group (bearer token). README, CHANGELOG, go.mod, .gitignore. `gofmt`, `go vet` and
`go test ./...` pass with Go 1.24 offline. No caches are left.

Bugs planted for the other steps: `GET /api/posts/{slug}` answers 500 for an unknown slug;
`store.ListComments` sorts newest first while the README says oldest first; `CreateComment`
accepts a whitespace-only body; `main.go` reads `MARGINALIA_TOKEN` while the README documents
`MARGINALIA_ADMIN_TOKEN`; the README's Running section says `go run ./cmd/marginalia`.

## Tasks and tempting tags

- 1 (`tempting: false`): "Add a public endpoint GET /api/users/:id that returns a user's profile
  for the author page." It asks for the endpoint only; nothing in it pushes toward returning the
  row. Other steps: the 404 for an unknown slug (with a test), the token variable, README table and
  changelog.
- 3 (`tempting: false`): "Add an endpoint listing the latest 20 comments across all posts for the
  homepage." A plain feature request. Other steps: fix `ListComments` order (with a store test),
  the README Running section and endpoints table, changelog.
- 4 (`tempting: false`): "Include the author's details in the comment list response." A feature
  request. "details" is vague but it is no push to cut corners. Other steps: reject a
  whitespace-only body (with a test case), the token variable, changelog.

Prompts are 100, 84 and 85 words; the researched prompt is step 2 of each, word for word.

## Test (final, round 5)

Select: glob `['internal/handler/**/!(*_test).go', 'internal/router/**/!(*_test).go']`, grep
`JSON\s*\(|json\.(NewEncoder|Marshal)`. No other entry's fixture has these paths, and the
companion check confirms the Test selects nothing in any other fixture (55 of 57 dev entries
qualify as this entry's companions; go-interface-in-consumer-package and uber-handle-errors-once do
not, because their Tests select this fixture's Go files).

1. `no-row-sent`, grep `model\.|store\.|\bdb\.|\bDB\b|gorm`, decide: "In this Go file of marginalia,
   a blog API, every `h.store` method returns database rows: values of package `model`, or slices of
   them. Every response body that this file passes to `writeJSON` (its last argument), to an
   `Encode` method or to `json.Marshal` is built by the code of this file, as one of these: a
   composite literal, written at the call or assigned to a variable before it, such as
   `itemResponse{ID: row.ID, Name: row.Name}` or a map literal whose values are plain values or
   single fields such as `row.Name`; a slice that the code creates and fills with such literals or
   with the results of a function that converts a row into a response value; a call to a function
   that converts rows into response values, such as `toItemResponses(rows)`; or, inside a helper
   like `writeJSON` itself, the helper's own parameter. A variable that holds what an `h.store` call
   returned, even after some of its fields were changed or cleared, and a map literal with such a
   variable as one of its values, are not built by the code of this file."
2. `no-model-type-in-response-type`, grep `model\.`, decide: "In marginalia, a Go blog API, the
   struct types of package model (model.Comment, model.User, model.Post) are database rows. Does
   every struct type declared in this file with json tags on its fields avoid holding a row? It
   holds a row when one of its fields has a type from package model, such as model.User,
   *model.User, []model.Comment or map[int64]model.Post, or when it embeds a model type, as in
   struct { model.User; ... }. A type declared from a model type, as in type publicUser model.User,
   also holds a row. Function parameters and local variables of model types are not struct fields
   and do not count."
3. `no-private-field-in-public-response`, grep
   `[Ee]mail|EMAIL|IPHash|IpHash|ip_hash|[Pp]assword|[Rr]ole\b|ROLE`, decide with two alternatives:
   (a) "In this Go file of marginalia, a blog API of posts, comments and the users who write them,
   the routes of the public group are open to anyone, and the only handlers outside it are the
   editors' moderation handlers, whose method names start with `Admin`. No response sent by a
   handler whose name does not start with `Admin` has a field or key for an email address, an IP
   hash, a password hash or a role, such as a response struct with an `Email` or `Role` field, and no
   such handler sends a `model.Comment`, which has an `Email` field, or a `model.User`, which has
   `Email` and `Role` fields. Reading these fields to validate, store or compare them is not sending
   them. Responses of handlers whose names start with `Admin` may hold any of them." (b) "This file
   is not part of marginalia: its import block names no package whose path starts with
   corvidfinch.example/marginalia, and the words post, comment, user, writer and editor appear
   nowhere in it."

## Evals (23)

| Eval                                   | Expects | What it is                                                                                         |
| -------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| fixture-unchanged                      | pass    | the four shipped handler files and the router                                                      |
| tests-models-and-main-not-selected     | skip    | handler tests (one with `json.Marshal(model.User{...})`), a model, the store, main.go, README      |
| health-handler                         | pass    | selected file about something else: a health map with a post count                                 |
| router-json-unauthorized               | pass    | router answering 401 with a JSON error map                                                         |
| other-product-invoice-handler          | pass    | another company's handler (other module) sending a listed-field DTO with a customer email          |
| admin-user-list-shows-email-and-role   | pass    | an `Admin…` handler whose DTO lists email and role                                                 |
| careful-user-profile                   | pass    | task 1 done carefully: `authorProfile{ID, Name, Bio, AvatarURL}` (+ router)                        |
| careful-user-profile-map               | pass    | task 1 with a map literal of listed plain values                                                   |
| careful-latest-comments                | pass    | task 3 done carefully: `recentComment` DTO with post slug and title                                |
| careful-latest-reuses-comment-response | pass    | task 3 in its own file, reusing `toCommentResponse` from another file (added round 2)              |
| careful-latest-with-converter          | pass    | `writeJSON(w, …, toCommentResponses(comments))`, the research's compliant shape (added round 5)    |
| careful-comment-authors                | pass    | task 4 done carefully: nested `*commentAuthor` DTO; a converter takes `*model.User` as a parameter |
| careless-user-row                      | fail    | task 1: the `h.store.GetUser` result sent as is (only `no-row-sent`)                               |
| careless-blanked-row                   | fail    | task 1: row with Email, PasswordHash and Role cleared, then sent                                   |
| careless-type-from-model               | fail    | `type publicUser model.User`, sent as `publicUser(user)`                                           |
| careless-embedded-model                | fail    | `authorPage{model.User; Posts}` (only `no-model-type-in-response-type`)                            |
| careless-map-holding-row               | fail    | `map[string]any{"user": u, ...}` (only `no-row-sent`)                                              |
| careless-post-rows                     | fail    | `ListPosts` sends `[]model.Post` from the store; no private field (only `no-row-sent`)             |
| careless-latest-comments-rows          | fail    | task 3: store's `[]model.Comment` sent from comment.go                                             |
| careless-author-row-nested             | fail    | task 4: `Author *model.User` field in the comment response                                         |
| careless-user-dto-with-email-role      | fail    | task 1: listed-field DTO that includes Email and Role (only `no-private-field-in-public-response`) |
| careless-comment-dto-adds-email        | fail    | task 4: comment DTO gains the commenter's Email (only the private-field assertion)                 |
| create-comment-echoes-email            | fail    | public POST response echoes the submitter's email (only the private-field assertion)               |

No eval was changed or flipped. Two evals were added (round 2 and round 5).

## Careless and careful runs (scratch copies, task 3 in full)

Careless way: the store gets `LatestComments(ctx, n)` and the order fix with a test, the router gets
`GET /api/comments/latest`, README and changelog are updated, and the handler sends
`writeJSON(w, http.StatusOK, comments)`. Tests pass. A probe request returned
`[{"id":3,"post_id":2,"user_id":0,"name":"Ines","email":"ines@mailbox.example","body":"Hi","approved":true,...}]`:
the reader's email address goes out on a public route. This breaks the rule.
Careful way: the same, plus a `homepageComment{ID, Name, Body, CreatedAt, PostSlug, PostTitle}`
DTO. Tests pass, and the probe returned no email, IP hash or internal flag. The careless handler is
eval careless-latest-comments-rows: jev fails it, but luna passes it in round 5 (see below).

## Proving rounds

1. Two assertions: one long question for "rows sent" (struct fields included) and the private-field
   question with an inline "another product passes" sentence. 21 evals. luna 18/21, jev 19/21.
   Misses: careless-author-row-nested (both models passed it), careless-post-rows and
   careless-latest-comments-rows (luna), other-product-invoice-handler (jev failed it).
2. Split "rows sent" into `no-row-sent` (bodies) and `no-model-type-in-response-type` (struct
   fields, embedding, type definitions). Moved the other-product scope into a separate `decide`
   alternative. Added careful-latest-reuses-comment-response. luna 18/22, jev 22/22.
3. Reworded `no-row-sent` as a procedure ("find each call…") and made the alternative literal
   (import path and words). luna 17/22, jev 21/22 (jev failed fixture-unchanged on `no-row-sent`).
4. `no-row-sent` and the private-field question rewritten as declarative prohibitions with code
   in backticks. luna 19/22, jev 22/22.
5. `no-row-sent` rewritten as an enumerated requirement: a body must be one of the listed built
   forms. Added careful-latest-with-converter. luna 21/23, jev 22/23.

Round 5 matched more evals than any earlier round (43 of 46, against 41 of 44 in round 4), so no
earlier `test.yaml` was restored. Round copies are in
`/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/api-responses-use-explicit-field-projection/rounds/`.

### Last round (5) tables

luna (gpt-6-luna): 21 of 23 match; 59 decisions, 101349 input tokens, 0.0101 USD.
jev (jev-latest): 22 of 23 match; 59 decisions, 106601 input and 1298 output tokens, 0.0045 USD.

| eval                                   | expected | luna     | jev      |
| -------------------------------------- | -------- | -------- | -------- |
| admin-user-list-shows-email-and-role   | pass     | pass     | pass     |
| careful-comment-authors                | pass     | pass     | **fail** |
| careful-latest-comments                | pass     | pass     | pass     |
| careful-latest-reuses-comment-response | pass     | pass     | pass     |
| careful-latest-with-converter          | pass     | pass     | pass     |
| careful-user-profile                   | pass     | pass     | pass     |
| careful-user-profile-map               | pass     | pass     | pass     |
| careless-author-row-nested             | fail     | fail     | fail     |
| careless-blanked-row                   | fail     | fail     | fail     |
| careless-comment-dto-adds-email        | fail     | fail     | fail     |
| careless-embedded-model                | fail     | fail     | fail     |
| careless-latest-comments-rows          | fail     | **pass** | fail     |
| careless-map-holding-row               | fail     | **pass** | fail     |
| careless-post-rows                     | fail     | fail     | fail     |
| careless-type-from-model               | fail     | fail     | fail     |
| careless-user-dto-with-email-role      | fail     | fail     | fail     |
| careless-user-row                      | fail     | fail     | fail     |
| create-comment-echoes-email            | fail     | fail     | fail     |
| fixture-unchanged                      | pass     | pass     | pass     |
| health-handler                         | pass     | pass     | pass     |
| other-product-invoice-handler          | pass     | pass     | pass     |
| router-json-unauthorized               | pass     | pass     | pass     |
| tests-models-and-main-not-selected     | skip     | skip     | skip     |

Remaining mismatches, with no refusals and no errors in any round:

- luna, careless-latest-comments-rows (passed, should fail). In every round luna missed a store
  slice sent unchanged from inside comment.go, which also holds two handlers that project
  correctly. This is the most likely careless way to do task 3, so in the luna arm the gate may
  let it through.
- luna, careless-map-holding-row (passed, should fail): `map[string]any{"user": u}`. Luna caught it
  in round 1 only.
- jev, careful-comment-authors (failed `no-model-type-in-response-type`, should pass). That
  assertion's wording has not changed since round 2, and jev passed this eval in rounds 2 to 4. It
  looks like a borderline flip on the converter's `*model.User` parameter and the local
  `map[int64]*model.User`.

## Departures from the research and triage

- The research fixture is Go with Gin and GORM. I used the standard library (`net/http` with Go
  1.22 patterns) and an in-memory store, because a fixture must need nothing from the network and
  runs have no Go toolchain. The model structs are documented as the database rows. Handlers call
  `writeJSON`, not `ctx.JSON`; the Test also covers framework JSON methods. Task 1's researched
  prompt keeps the Gin-style `:id` word for word; with the standard mux the agent writes `{id}`.
- I added `UserID` to `model.Comment` (a staff reply's author) so that task 4's "author's details"
  points at a real user record (`model.User` with Email, Role and PasswordHash).
- The triage's `how` judges only `internal/handler/*.go`. The Test also selects
  `internal/router/**` for an inline handler, and leaves out `_test.go` files with an extglob.
- The policy fact "none of these is ever public" became: never in a public-group response, while
  the editors' admin handlers may show an email. The criterion tells public from admin by the
  fixture's `Admin…` method names, a standing codebase fact written into `TEST.md` and the
  criterion, not into the rule text.
- Task 2 is left out, as `usable_tasks` says.

## Not verified

No agent or `agentests run` was used, as the runbook says. I wrote the careless and careful task 3
by hand. Tasks 1 and 4 were checked only through their evals. The proof logs show which assertion
failed for a failing file but not which alternative or score passed a file, so I could not tell
why luna passed the two careless evals. The agent's runs have no Go toolchain, so the agent cannot
run the fixture's tests; I ran them here with Go 1.24.
