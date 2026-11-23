# Log statements redact user data

Tidegate's logs are shipped to support and to an outside log service, so what a Go file hands to the
logger is held to this:

Log statements wrap user data (document ids, document contents, usernames, emails and other personal data) in the user-data redaction wrapper and metadata in the metadata wrapper, and never log credentials, tokens or keys at all.

- The project's log calls are `base.InfofCtx`, `base.WarnfCtx` and `base.DebugfCtx`; `base.UD(v)` is the user-data redaction wrapper and `base.MD(v)` the metadata wrapper.
- Metadata is what names the deployment rather than its users: database names, config keys and identity provider names.
- Credentials, tokens and keys include passwords, session ids, cookie values, authorization codes and client secrets, and the raw body of an identity provider's response, which can carry any of them: none of these is logged, wrapped or not. A non-secret field picked out of such a response, such as its `error` code, is logged wrapped in `base.UD`.
- Counts, sizes, durations, HTTP status codes, Go error values and fixed strings written in the code need no wrapper.

The rule covers every Go file that calls the project's logger. The logger itself, in `base/`, and
files that log nothing are out of scope.
