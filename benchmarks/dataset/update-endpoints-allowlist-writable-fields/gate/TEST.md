# Create and update endpoints copy only an allowlist of fields

The TypeScript route handlers under `src/routes/` that create or update a stored record from the
request body copy only the fields they name:

Endpoints that create or update records from user input must copy only an explicit allowlist of user-editable fields; the request body is never passed wholesale to the database, so owner, role and foreign-key fields cannot be set by the client.

- An allowlist names each field the handler takes from the request body, as in `const { title, key } = req.body` followed by `data: { title, key }`, or loops over a fixed list of field names written in the code. Passing `req.body` itself to `create` or `update`, spreading it (`{ ...req.body, userId: req.user.id }`), assigning it onto a record with `Object.assign`, copying whatever keys it has, or removing a few fields and keeping the rest are wholesale copies.
- Ids and foreign keys (`id`, `userId`, `ownerId`, `orgId`), `role` and timestamps such as `createdAt` are never on an allowlist: the server sets them from the signed-in user (`req.user`), the URL or the clock. The one exception is a user's `role`, which an admin may change through an allowlist that is used only when `req.user.role` is `"admin"`.

Route files that write no record from the request body pass. Tests and the code outside
`src/routes/` are not judged.
