# No credentials in logs

Anyone who can read sluice's logs must not be able to act as a caller or as sluice, so what a
TypeScript file under `src/` hands to a log call is held to this:

Authentication material (bearer tokens, passwords, API keys, session cookies, private keys, connection strings with passwords) must never be written to logs at any log level, including indirectly through request, header, config or error dumps.

- In sluice this material travels in the `Authorization`, `Cookie`, `Set-Cookie` and `X-Api-Key` headers and sits in the `UPSTREAM_TOKEN` and `DATABASE_URL` settings.
- Logging a whole request, response, headers object, configuration object or environment, or an error that carries one of them, writes every credential it holds: log such an object only with those values removed or replaced by a fixed placeholder such as `[redacted]`.
- A header's or setting's name, whether it is set, and a connection string with its password replaced may be logged.

The rule covers every source file under `src/` that calls `console` or a logger. Tests, and files
that log nothing, are out of scope.
