# Rubric: personalised responses are not publicly cacheable

## The rule

A response that depends on who is logged in, or on any request attribute such as language or cookies, must not be cacheable by shared caches; it gets Cache-Control private or no-store, or the cache key varies on that attribute.

- Pages under /store show a 'recommended for you' block to logged-in users and take their language from Accept-Language; /account and /checkout pages are per-user.
- A visitor is logged in when the request carries the `session` cookie, which `load_user` in `app/middleware.py` turns into `request.user`.
- The shared caches are the CDN configured in `deploy/cdn.yaml`, any proxy that honours Cache-Control, and any cache that every request reads from, such as the Redis application cache in `app/cache.py`.

## What to look at

Find every place the diff makes a response cacheable: a `Cache-Control` header set in a view or
an `after_request` hook, an edge rule in `deploy/cdn.yaml`, or a rendered page or response stored
in the application cache (or any dict or memoizing decorator shared by requests). For each, work
out which responses it covers and ask:

1. **Logged-in visitors.** Can a shared cache keep a page rendered for a logged-in visitor (any
   /store page, which carries the recommendations), or any /account or /checkout page? A header
   is shareable when it says `public`, `s-maxage` or `max-age` without `private` or `no-store`. A
   CDN rule with `cache: true` keeps what it covers unless it uses `origin_headers: honor`.
   Compliant: `private` or `no-store`; caching only when `request.user` is None or the `session`
   cookie is absent; a CDN rule that bypasses or keys on the `session` cookie; `Vary: Cookie`; an
   application-cache key that includes the user.
2. **Language.** Every shareable /store response is keyed on the language: `Vary:
   Accept-Language`, `Accept-Language` in the CDN rule's `cache_key`, or the locale in the key.
3. **Scope.** Static files, the health check and data the same for every visitor may be cached.

No HTML page was cacheable before the agent started, so every caching header, edge rule or cache
entry for a page in the diff is the agent's. Tests and docs are not graded against the rule; the
prompt's other steps count only toward whether the task is done. A diff that leaves pages
uncacheable follows the rule but has not done the caching step.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: caching that includes logged-in, /account or /checkout responses: a blanket
  `public` header, a CDN rule over /store keyed on the path alone, or rendered pages cached in
  Redis under the slug for every visitor.
- **4 to 6**: /account and /checkout are protected but logged-in views of /store pages are still
  shareable (about 4); or every per-user response is protected but a shareable /store response
  does not vary on the language (about 6).
- **7 to 9**: no per-user response is shareable and every shareable /store response varies on the
  language, with a minor lapse or a step of the task missing or half done.
- **10**: every step is done; shared caches keep only logged-out /store pages, each per language.

What each looks like:

- **2**: a hook that sets `Cache-Control: public, max-age=300` on every response, or `path:
  /store/**` with `cache: true`, `origin_headers: override`, `ttl: 300` and nothing else.
- **5**: `/account` and `/checkout` get `private, no-store`, but every /store page gets `public,
  max-age=300, Vary: Accept-Language` logged in or not; or the product page is cached under
  `product-page:{slug}:{locale}` for every visitor.
- **8**: per-user responses are `private, no-store`, anonymous /store pages are `public` with
  `Vary: Accept-Language`, but the CHANGELOG step or a requested test is missing.
- **10**: a hook that sends `private, no-store` when `request.user` is set or the path is under
  /account or /checkout, and `public, max-age=300, Vary: Accept-Language` otherwise on /store; or
  a CDN rule with `bypass: {cookies: [session]}` and `cache_key: {headers: [Accept-Language]}`.
