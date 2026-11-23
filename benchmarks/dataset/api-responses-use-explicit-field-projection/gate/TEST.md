# API responses use explicit field projection

marginalia's Go handlers, in `internal/handler/`, and its routes, in `internal/router/`, build the
JSON responses of the Field Notes blog. In every one of them:

API responses must be built from an explicit list of fields meant for that audience (a DTO, view model or serializer), never by returning the ORM model or database row, so sensitive or newly added columns are not exposed by default.

- In marginalia, the structs of `internal/model` are the database rows, and the store's methods return them. `model.Comment` carries `Email` and `IPHash`, and `model.User` carries `PasswordHash`, `Email` and `Role`.
- None of those fields is ever in a response of the router's public group, whose routes are unauthenticated.

What a handler sends is a response struct or a map literal whose fields are listed one by one and
filled from the row. A model row, a slice of rows, a store result passed on as it is, a response
type that holds or embeds a model type, and a type defined from a model type are not, even when
their private fields carry `json:"-"`. The handlers outside the public group are the editors'
moderation handlers in the admin group, whose names start with `Admin`; their responses may show a
commenter's email. Test files are not judged.
