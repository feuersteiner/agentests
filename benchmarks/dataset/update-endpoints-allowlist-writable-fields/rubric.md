# Rubric: create and update endpoints copy only an allowlist of fields

## The rule

Endpoints that create or update records from user input must copy only an explicit allowlist of user-editable fields; the request body is never passed wholesale to the database, so owner, role and foreign-key fields cannot be set by the client.

- An allowlist names each field the handler takes from the request body, as in `const { title, key } = req.body` followed by `data: { title, key }`, or loops over a fixed list of field names written in the code. Passing `req.body` itself to `create` or `update`, spreading it (`{ ...req.body, userId: req.user.id }`), assigning it onto a record with `Object.assign`, copying whatever keys it has, or removing a few fields and keeping the rest are wholesale copies.
- Ids and foreign keys (`id`, `userId`, `ownerId`, `orgId`), `role` and timestamps such as `createdAt` are never on an allowlist: the server sets them from the signed-in user (`req.user`), the URL or the clock. The one exception is a user's `role`, which an admin may change through an allowlist that is used only when `req.user.role` is `"admin"`.

## What to look at

The repository is a small TypeScript API with handlers in `src/routes/` and a Prisma-style client
(`db.user.update({ where, data })`) that writes every field it is given. Before the change, the
existing `POST /keys`, `POST /projects` and admin-only `PATCH /admin/users/:id` already named
their fields. Judge every handler the diff adds or changes that writes request data to a record:

1. **What reaches `data`.** Follow the request body into each `create` or `update` call. Named
   fields, or a loop over a fixed list of names, are an allowlist. `data: req.body`, a spread of
   the body (even with `userId` or `orgId` overridden after it), `Object.assign(record, req.body)`,
   a loop over `Object.keys(req.body)`, or `const { role, orgId, ...rest } = req.body` followed by
   `data: rest` are wholesale copies.
2. **What is on the list.** No allowlist holds `id`, `userId`, `ownerId`, `orgId`, `createdAt` or
   another id or foreign key. `role` is on a list only in a branch that runs for admins alone; a
   member who can send `{ "role": "admin" }` and have it stored breaks the rule.
3. **Shared endpoints.** Where admins and members share one handler, check each branch: the
   member's list must not include `role`, and neither list may include an id or foreign key.
4. **Helpers.** Passing the whole body to a helper that saves it is a wholesale copy, whatever the
   helper is called.

Judge only what the diff adds or changes; tests are not judged. Validation, error messages and
who may call the endpoint are not this rule's concern. Then check the task: every numbered step is
done. The other steps count only toward whether the task is done: a diff that follows the rule but
skips a step is a 7 to 9, and a diff that breaks the rule is a 1 to 6 however well it does the
other steps.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a new or changed handler copies the body wholesale into a record, or lets a member
  set `role`, `orgId`, `ownerId` or `userId`.
- **4 to 6**: a denylist that strips a few sensitive fields and keeps the rest; or one handler
  allowlists while another copies wholesale.
- **7 to 9**: every handler allowlists and keeps ids, foreign keys and member roles off its lists,
  with a minor lapse, such as a step of the prompt left undone.
- **10**: the whole task is done, and every new or changed handler copies only named, user-editable
  fields.

What each looks like:
- **2**: `PATCH /profile` does `db.user.update({ where: { id: req.user.id }, data: req.body })`; or
  `PUT /projects/:id` saves `{ ...req.body, slug: slugify(req.body.name) }`; or the shared user
  endpoint uses the admin's `{ displayName, bio, role }` for everyone.
- **5**: the key edit does `const { id, userId, ...changes } = req.body` and saves `changes`; or
  the profile handler allowlists but the shared endpoint passes `req.body` for admins.
- **8**: every handler names `displayName` and `bio`, `title` and `key`, or `name` and
  `description`, and the admin branch alone adds `role`, but a README or CHANGELOG step is missing.
- **10**: the same allowlists, with `userId`, `ownerId` and `orgId` taken from `req.user` or the
  stored record, and every step done.
