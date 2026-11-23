---
name: personalised-responses-not-publicly-cacheable
description: Use whenever you add or change caching of web responses in an app with logged-in users or translated pages - Cache-Control or Vary headers set in views or after_request hooks, CDN edge rules (deploy/cdn.yaml), or rendered pages and responses stored in Redis or another shared cache (app/cache.py) - even when the request is only about speed or server load. Covers keeping per-user and per-language responses out of shared caches.
---

# Personalised responses are not publicly cacheable

## The rule

A response that depends on who is logged in, or on any request attribute such as language or cookies, must not be cacheable by shared caches; it gets Cache-Control private or no-store, or the cache key varies on that attribute.

- Pages under /store show a 'recommended for you' block to logged-in users and take their language from Accept-Language; /account and /checkout pages are per-user.
- A visitor is logged in when the request carries the `session` cookie, which `load_user` in `app/middleware.py` turns into `request.user`.
- The shared caches are the CDN configured in `deploy/cdn.yaml`, any proxy that honours Cache-Control, and any cache that every request reads from, such as the Redis application cache in `app/cache.py`.

## Why

A shared cache hands the copy it kept to the next visitor who asks for the same key. If that copy
was rendered for a logged-in customer, the next visitor sees their name, recommendations, orders
or billing address. That is how the Steam store leaked about 34,000 customers' pages to other
users at Christmas 2015, when a caching rule was applied to authenticated traffic, and how some
users got the store in the wrong language. The header is valid HTTP either way, and tests with
one visitor pass, so it has to be checked by reading what each cached response depends on.

## How to apply it

For every header, edge rule or cache entry you add, list the responses it covers, then:

1. If any of them can be rendered for a logged-in visitor, or reads a cookie, mark those
   `Cache-Control: private, no-store`, cache only when `request.user` is None, or put the user
   or session into the cache key (`Vary: Cookie`, an edge rule that bypasses or keys on the
   `session` cookie, a Redis key with the user id).
2. If they change with the language, key the shared copy on it: `Vary: Accept-Language`,
   `Accept-Language` in the edge rule's cache key, or the locale in the Redis key.
3. `max-age` without `private` is shareable, just like `public`. A path-based edge rule that
   ignores origin headers covers logged-in requests to that path too.

Static files, health checks and data that is the same for everyone can be cached freely.

## Example

A help-centre article whose header greets the logged-in visitor by name.

Violating: every visitor gets the copy the CDN kept, greeting and all, in one language.

```python
def article(request, slug):
    response = Response(render_article(slug, request.user, locale_from(request)))
    response.headers["Cache-Control"] = "public, max-age=600"
    return response
```

Compliant: only logged-out copies are shared, and they vary on the language.

```python
def article(request, slug):
    response = Response(render_article(slug, request.user, locale_from(request)))
    if request.user is None:
        response.headers["Cache-Control"] = "public, max-age=600"
        response.headers["Vary"] = "Accept-Language"
    else:
        response.headers["Cache-Control"] = "private, no-store"
    return response
```

## Before you commit

Go through the staged diff and, for each caching header, edge rule or cache write, name the
responses it covers. Confirm none of them can be a logged-in, /account or /checkout response
unless it is private, no-store or keyed on the user, and that every shared /store copy varies on
the language. Fix what fails and check again before you commit.
