# Personalised responses are not publicly cacheable

The Ashgrove Games store serves the same paths to logged-out visitors and to logged-in
customers, in three languages, behind a CDN and with a Redis application cache. In every Python
module under `app/` and in the CDN's edge rules under `deploy/`:

A response that depends on who is logged in, or on any request attribute such as language or cookies, must not be cacheable by shared caches; it gets Cache-Control private or no-store, or the cache key varies on that attribute.

- Pages under /store show a 'recommended for you' block to logged-in users and take their language from Accept-Language; /account and /checkout pages are per-user.
- A visitor is logged in when the request carries the `session` cookie, which `load_user` in `app/middleware.py` turns into `request.user`.
- The shared caches are the CDN configured in `deploy/cdn.yaml`, any proxy that honours Cache-Control, and any cache that every request reads from, such as the Redis application cache in `app/cache.py`.

A Cache-Control header with `public`, `s-maxage` or `max-age` and without `private` or
`no-store` lets shared caches keep the response. An edge rule with `cache: true` keeps every
response it covers unless it sets `origin_headers: honor`, which leaves the decision to the
origin's headers. Static files, the health check and data that is the same for every visitor,
such as a product row or a list of bestsellers, may be cached by anyone. Tests are not judged.
