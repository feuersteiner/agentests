---
name: api-responses-use-explicit-field-projection
description: Use whenever you add or change an HTTP endpoint, a handler or a JSON response in the Go API (internal/handler/ and internal/router/), or add a field to a model struct in internal/model/ that a handler could send, for example a new endpoint, a new list, or a related object nested in an existing response. Covers what a response may contain, for which audience, and how to build it from the rows the store returns.
---

# API responses use explicit field projection

## The rule

API responses must be built from an explicit list of fields meant for that audience (a DTO, view model or serializer), never by returning the ORM model or database row, so sensitive or newly added columns are not exposed by default.

- In marginalia, the structs of `internal/model` are the database rows, and the store's methods return them. `model.Comment` carries `Email` and `IPHash`, and `model.User` carries `PasswordHash`, `Email` and `Role`.
- None of those fields is ever in a response of the router's public group, whose routes are unauthenticated.

## Why

A row has every column of its table, and a table grows. The Ech0 blog engine sent its comment
rows straight from its public comment endpoints. Most private fields had `json:"-"`, but
`Email` did not, so any visitor could list every commenter's email address (GHSA-rj4g-rqgh-rx9h).
Tags on the row are a deny list that each new column has to remember to join; a response type is
an allow list, and a new column stays private until someone adds it on purpose.

## How to apply it

1. Decide who calls the route: anyone (public group) or editors (admin group).
2. Declare a response struct for that audience with only the fields it needs, and fill it field by
   field from the row: `out := profileResponse{ID: u.ID, Name: u.Name}`. A map literal with listed
   keys is fine too.
3. Nest the same way: a related row inside a response gets its own small response struct, never the
   row itself.
4. Pass only response values to `writeJSON` or an encoder.

Slips to watch for:

- `writeJSON(w, http.StatusOK, rows)` with whatever the store returned, because it already has JSON
  tags.
- A response struct with a field of a model type (`Owner model.User`), an embedded model, or
  `type publicThing model.Thing`.
- "Hiding" a field with `json:"-"` on the model, or blanking it on the row before sending it.
- Copying every field into the response struct, `Email` and `Role` included, on a public route.

## Example

A public list of who is coming to a club event. `model.RSVP` holds `MemberName`, `Phone` and
`Notes`.

Violating: the rows go out as they are, phone numbers included, and so will any column added later.

```go
rsvps, err := h.store.ListRSVPs(r.Context(), eventID)
// ...
writeJSON(w, http.StatusOK, rsvps)
```

Compliant: the public response lists the one field the page shows.

```go
type attendee struct {
	Name string `json:"name"`
}

out := make([]attendee, 0, len(rsvps))
for _, rsvp := range rsvps {
	out = append(out, attendee{Name: rsvp.MemberName})
}
writeJSON(w, http.StatusOK, out)
```

## Before you commit

For every response the diff adds or changes, check that what reaches `writeJSON` or the encoder is a
response struct or map with listed fields, that no model type appears in it at any depth, and that
no public response holds an email, IP hash, password hash or role. Fix what fails and check again.
