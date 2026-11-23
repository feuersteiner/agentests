---
name: couchbase-redact-user-data-in-logs
description: Use whenever you add or change a log statement in Tidegate's Go code, meaning any call to base.InfofCtx, base.WarnfCtx or base.DebugfCtx, or any other output meant for the logs, in auth, db, rest or a new package. Applies to debug logging, warnings, audit lines and logging of failures or of responses from other services, even if the request does not mention privacy or redaction. Covers which logged values go in base.UD or base.MD and which must never be logged.
---

# Log statements redact user data

## The rule

Log statements wrap user data (document ids, document contents, usernames, emails and other personal data) in the user-data redaction wrapper and metadata in the metadata wrapper, and never log credentials, tokens or keys at all.

- The project's log calls are `base.InfofCtx`, `base.WarnfCtx` and `base.DebugfCtx`; `base.UD(v)` is the user-data redaction wrapper and `base.MD(v)` the metadata wrapper.
- Metadata is what names the deployment rather than its users: database names, config keys and identity provider names.
- Credentials, tokens and keys include passwords, session ids, cookie values, authorization codes and client secrets, and the raw body of an identity provider's response, which can carry any of them: none of these is logged, wrapped or not. A non-secret field picked out of such a response, such as its `error` code, is logged wrapped in `base.UD`.
- Counts, sizes, durations, HTTP status codes, Go error values and fixed strings written in the code need no wrapper.

## Why

Logs leave the gateway: support reads them and they are shipped to an outside log service. With
redaction on, the logger replaces everything tagged with `base.UD` by a hash, so a line stays
useful for debugging without naming a person or a document. A value that is not tagged cannot be
redacted later. A secret is different: a hash of a line is no protection for a session id or a
token that anyone reading the log could replay, so those stay out of the log entirely.

## How to apply it

For every argument of every log call you write or touch, decide which of four things it is:

1. **User data**: who the user is or what they stored. Wrap it: `base.UD(username)`,
   `base.UD(doc.ID)`, `base.UD(user.Email)`.
2. **Metadata**: a database name, a config key, an identity provider's name. Wrap it:
   `base.MD(dbName)`.
3. **A secret**: a password, session id, cookie value, authorization code, client secret, any
   token or key, or a whole response body from an identity provider. Do not log it. Log what you
   can say about it instead: that it was missing, its HTTP status, a parsed `error` field in
   `base.UD`.
4. **Plain**: a count, size, duration, status code, `err` or a string constant. Leave it as it is.

Common slips:

- Printing a whole struct (`%+v` of a user, session, document or provider): it drags its user data
  and secrets into the line. Log the fields you need, each wrapped.
- Wrapping a secret in `base.UD` and logging it anyway.
- Putting a response body or a session id into an error's text and then logging the error.
- Reaching for `log.Printf` or `fmt.Println`, which cannot redact. Use the `base` calls.
- A `name` is not always metadata: a database's name is, a user's name is not.

## Example

Violating: the email and database name are raw, and the reset token is logged.

```go
base.InfofCtx(ctx, "Password reset mail sent to %s for database %s (token %s)",
	user.Email, dbName, resetToken)
```

Compliant: the same event, redactable, with nothing replayable in it.

```go
base.InfofCtx(ctx, "Password reset mail sent to %s for database %s, link valid for %s",
	base.UD(user.Email), base.MD(dbName), resetTTL)
```

## Before you commit

Read every log call in the staged diff, argument by argument, against the four kinds above. Fix
any raw user data or metadata, delete any secret from the line, and read the diff again before you
commit.
