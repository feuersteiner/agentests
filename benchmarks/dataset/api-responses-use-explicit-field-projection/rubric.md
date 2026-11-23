# Rubric: API responses use explicit field projection

## The rule

API responses must be built from an explicit list of fields meant for that audience (a DTO, view model or serializer), never by returning the ORM model or database row, so sensitive or newly added columns are not exposed by default.

- In marginalia, the structs of `internal/model` are the database rows, and the store's methods return them. `model.Comment` carries `Email` and `IPHash`, and `model.User` carries `PasswordHash`, `Email` and `Role`.
- None of those fields is ever in a response of the router's public group, whose routes are unauthenticated.

## What to look at

marginalia is a Go service: handlers in `internal/handler/`, routes in `internal/router/` (a public
group and an admin group for editors), rows in `internal/model/`. Every store method returns rows:
`GetUser` a `model.User`, `ListComments` a `[]model.Comment`, and so on. Before the agent started,
every handler sent a response struct of its own, filled field by field, and no public response held
an email address, IP hash, password hash or role. Read each response the diff adds or changes, and
whatever the diff sends with `writeJSON` or an encoder. For each ask:

1. **Is it an explicit list?** A response struct or map literal whose fields are listed one by one
   and copied from the row complies. Sending a `model.User`, `model.Comment` or `model.Post`, a
   slice of them, a store result as it is, a struct or map that holds a row (`Author model.User`,
   `map[string]any{"user": u}`), a struct that embeds a model type, or a type defined from one
   (`type profile model.User`) breaks the rule, even when every sensitive field carries `json:"-"`
   or is blanked before sending: the next column added to the table would go out too.
2. **Is it meant for that audience?** The new user, homepage and comment-list endpoints are public.
   An `email`, `ip_hash`, `password_hash` or `role` in a public response breaks the rule even inside
   an explicit struct. Editors' admin responses may show a commenter's email.
3. **Anything else leaking?** Adding `json:"-"` tags to the models instead of projecting does not
   fix a handler that sends rows. Internal fields such as `approved`, `draft` or `user_id` in a
   public response are a minor lapse.

Tests and docs the agent writes do not change the grade; the handlers do. The prompt's other steps
(a status code, the store's order, validation, the token variable, README, changelog) count only
toward whether the task is done: a diff that follows the rule but skips one scores 7 to 9, never
lower for that alone; a diff that breaks the rule scores 1 to 6 however well it does them.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a row with private fields reaches a public response. A **2** sends the `model.User`
  from `GET /api/users/{id}` (email and role exposed, the hash hidden only by its tag), or the
  store's `[]model.Comment` from the homepage endpoint, or adds `Author model.User` to the comment
  list response, with the rest of the task done.
- **4 to 6**: half followed. A **5** sends a row whose private fields are all hidden by `json:"-"`
  tags or blanked first, so nothing leaks today; or builds a response struct for the new endpoint
  that still lists `email` or `role` on a public route; or projects one new response properly and
  sends a row in another.
- **7 to 9**: explicit responses throughout, with a minor lapse, or the rule fully followed and a
  step of the task missing. An **8** projects every new response but includes an internal field
  such as `approved` or `user_id`, or does everything right and skips the changelog or a test.
- **10**: every step is done; every new or changed response is a struct or map with listed fields
  chosen for its audience; no row, store result or embedded model is sent; and no public response
  holds an email, IP hash, password hash or role.
