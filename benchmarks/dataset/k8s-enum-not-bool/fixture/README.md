# Trellis API

The JSON API behind Trellis, Fernhill's project tracker. It covers projects and their members,
outgoing webhooks and API keys. Handlers are plain functions that take a request body and return
`{ status, body }`; the HTTP layer that calls them lives in another repository.

## Layout

- `src/api/types.ts`: the request and response types, and the default settings.
- `src/api/projects.ts`: projects, their settings and their members.
- `src/api/webhooks.ts`: webhooks and their delivery.
- `src/api/keys.ts`: API keys.
- `src/store.ts`: the in-memory store the handlers read and write.
- `src/mailer.ts`: outgoing email, kept in an outbox.
- `src/util/`: small helpers.
- `test/`: the test suite.

## Running the tests

```sh
bun test
```

## Projects

`createProject(ownerId, { name, settings? })` creates a project. Its slug is made from the name.

| Setting       | Values                        | Default   |
| ------------- | ----------------------------- | --------- |
| `visibility`  | `private`, `team`, `public`   | `private` |
| `defaultRole` | `member`, `viewer`            | `member`  |

`updateProjectSettings(projectId, actorId, settings)` changes any of them; only the owner may.

`addMember(projectId, actorId, { userId, role? })` adds a member with the given role, or the
project's `defaultRole`, and emails the new member.

## Webhooks

`createWebhook(projectId, { url, events, payloadFormat? })` registers a webhook for the events
`project.updated` and `member.added`. `payloadFormat` is `json` (the default) or `form`.

`deliver(webhook, event, payload, send)` posts the payload. A delivery that fails, by a status of
500 or more or a network error, is tried again with exponential backoff, up to 3 attempts in all.

## API keys

`createKey(projectId, { name })` returns the new key with its secret. The secret is shown this one
time only: `listKeys(projectId)` returns each key's `prefix`, the first 8 characters, instead.

`authorize(secret, method)` answers which key and project a request belongs to, or 401.
