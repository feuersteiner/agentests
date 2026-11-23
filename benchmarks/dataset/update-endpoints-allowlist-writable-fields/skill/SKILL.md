---
name: update-endpoints-allowlist-writable-fields
description: Use whenever you write or change an HTTP handler under src/routes/ that creates or updates a stored record from the request body - a new POST, PUT or PATCH endpoint, an edit or profile form's handler, an admin endpoint, or a handler shared by several kinds of user - even if the request never mentions security. Covers which fields of the request body a handler may copy into the record, and where owner, organisation and role fields come from.
---

# Create and update endpoints copy only an allowlist of fields

## The rule

Endpoints that create or update records from user input must copy only an explicit allowlist of user-editable fields; the request body is never passed wholesale to the database, so owner, role and foreign-key fields cannot be set by the client.

- An allowlist names each field the handler takes from the request body, as in `const { title, key } = req.body` followed by `data: { title, key }`, or loops over a fixed list of field names written in the code. Passing `req.body` itself to `create` or `update`, spreading it (`{ ...req.body, userId: req.user.id }`), assigning it onto a record with `Object.assign`, copying whatever keys it has, or removing a few fields and keeping the rest are wholesale copies.
- Ids and foreign keys (`id`, `userId`, `ownerId`, `orgId`), `role` and timestamps such as `createdAt` are never on an allowlist: the server sets them from the signed-in user (`req.user`), the URL or the clock. The one exception is a user's `role`, which an admin may change through an allowlist that is used only when `req.user.role` is `"admin"`.

## Why

The database client writes every field it is given, and the client controls every field of the
body. In 2012 GitHub's public-key form accepted any attribute of the key record, so a user
attached his own SSH key to the Rails organisation and pushed a file to the Rails repository to
prove it. The handler
type-checked and its tests passed; nobody had decided which fields a user may set. A denylist
fails the same way the day someone adds a column: the new field is writable before anyone thinks
about it.

## How to apply it

1. Decide which fields a user may edit on this record, and name exactly those.
2. Take the owner, organisation and author from `req.user`, and the record's id from the URL.
   Never read them from the body, even on create.
3. On PATCH, leave unsent fields `undefined` (the client skips them) rather than spreading the
   body to get "only what was sent".
4. If admins may set more than members, keep two lists and pick the admin one only after checking
   `req.user.role === 'admin'`.

Slips to watch for: `data: req.body`; `{ ...req.body, ownerId: req.user.id }` (every other field
still comes through); `for (const k in req.body)`; `const { role, ...rest } = req.body`; one
`EDITABLE` list with `role` in it used for every caller; passing `req.body` to a helper that saves.

## Example

A handler lets a team member edit a webhook's URL and description.

Violating: the body goes straight to the database, so `{ "teamId": "t_other" }` moves the webhook
to another team.

```ts
const hook = await db.webhook.update({ where: { id: req.params.id }, data: { ...req.body } });
```

Compliant: only the editable fields are copied; the team stays where it was.

```ts
const { url, description } = req.body;
const hook = await db.webhook.update({ where: { id: req.params.id }, data: { url, description } });
```

## Before you commit

For every `create` and `update` the diff adds or changes, read what goes into `data` and trace each
field back: a name you chose, or the body itself? Check that no list holds an id, a foreign key,
a timestamp, or `role` outside an admin-only branch. Fix what fails, run the tests, and check again.
