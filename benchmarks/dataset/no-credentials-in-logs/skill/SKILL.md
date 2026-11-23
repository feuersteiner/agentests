---
name: no-credentials-in-logs
description: Use whenever you add or change logging in TypeScript code under src/ - a log call at any level (trace, debug, info, warn, error), request or access logging, logging settings at startup, logging outgoing calls, responses or failures - even if the request never mentions secrets. Covers which headers, settings and objects must never reach a log, and how to log requests, configuration and errors with credentials redacted.
---

# No credentials in logs

## The rule

Authentication material (bearer tokens, passwords, API keys, session cookies, private keys, connection strings with passwords) must never be written to logs at any log level, including indirectly through request, header, config or error dumps.

- In sluice this material travels in the `Authorization`, `Cookie`, `Set-Cookie` and `X-Api-Key` headers and sits in the `UPSTREAM_TOKEN` and `DATABASE_URL` settings.
- Logging a whole request, response, headers object, configuration object or environment, or an error that carries one of them, writes every credential it holds: log such an object only with those values removed or replaced by a fixed placeholder such as `[redacted]`.
- A header's or setting's name, whether it is set, and a connection string with its password replaced may be logged.

## Why

Logs are read by many more people and systems than the service itself: log shippers, dashboards,
support, contractors, backups. A bearer token or session cookie in a log line can be replayed by
anyone who reads it. Kubernetes shipped exactly this (CVE-2019-11250): at high verbosity the API
server logged request headers, bearer tokens included, so anyone with log access could act as the
user. "It is only at debug level" does not help: debug gets switched on in production precisely
when something is wrong.

## How to apply it

1. Never pass `request.headers`, `response.headers`, `Object.fromEntries(headers)`, `fetch`
   options or a whole request or response to a log call. Log the fields you need, and headers
   through one redaction that covers every credential header.
2. Never log `config`, `process.env` or `Bun.env` whole. Pick the non-secret settings, show a
   secret only as set or `[redacted]`, and mask the password in a connection string.
3. For a failure, log the method, URL, status, timeout, request id and the error's name and
   message, not an error object that carries the request or its headers.

Slips to watch for: `log.debug({ headers })` "only for debugging"; a redaction list with
`authorization` but not `cookie`, `set-cookie` or `x-api-key`; `log.info({ config })` at startup;
`DATABASE_URL` logged with its password; `log.error({ err, request })` to "reproduce" a failure.

## Example

A billing worker logs each call it makes to a payments provider.

Violating: the whole options object goes to the log, `Authorization: Bearer sk_live_...` included.

```ts
log.debug({ url, options }, 'calling payments provider');
```

Compliant: the same detail, with every credential header replaced.

```ts
const SECRET_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key']);
const safe = Object.fromEntries(
	[...new Headers(options.headers)].map(([name, value]) => [name, SECRET_HEADERS.has(name) ? '[redacted]' : value])
);
log.debug({ url, method: options.method, headers: safe }, 'calling payments provider');
```

## Before you commit

Read every log call in the diff, at every level. For each argument, ask what it holds at run time:
a headers object, a config object, the environment, an error carrying a request. Redact or drop
each credential, run the tests, and check again.
