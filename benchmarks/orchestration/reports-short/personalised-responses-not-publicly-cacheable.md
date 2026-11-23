# personalised-responses-not-publicly-cacheable

Status: built, verified, Test frozen after the fifth (last allowed) proving round with 4 mismatches left on each model. Entry folder: `benchmarks/dataset/personalised-responses-not-publicly-cacheable/`.

## Rule text (benchmark.yaml `rule`)

```text
A response that depends on who is logged in, or on any request attribute such as language or cookies, must not be cacheable by shared caches; it gets Cache-Control private or no-store, or the cache key varies on that attribute.

- Pages under /store show a 'recommended for you' block to logged-in users and take their language from Accept-Language; /account and /checkout pages are per-user.
- A visitor is logged in when the request carries the `session` cookie, which `load_user` in `app/middleware.py` turns into `request.user`.
- The shared caches are the CDN configured in `deploy/cdn.yaml`, any proxy that honours Cache-Control, and any cache that every request reads from, such as the Redis application cache in `app/cache.py`.
```

The rule sentence is the research `rule`, word for word. The first bullet is the triage `policy_facts`, word for word. I added two bullets of standing policy: the session cookie and `request.user` (so "logged in" can be judged from one file), and the list of shared caches. That list ends "any cache that every request reads from, such as the Redis application cache", so a module-level dict shared by all requests counts too.

## Fixture

`ashgrove-store`, the storefront of the fictional Ashgrove Games. It uses the standard library only. Flask cannot be installed offline, so `app/web.py` is a small Flask-style layer (`Request`, `Response`, `NotFound`, `App` with routes and before/after hooks). Files:

- `app/routes/store.py`: `/store` and `/store/products/<slug>`, with the "recommended for you" block for logged-in visitors and the language from Accept-Language.
- `app/routes/account.py`: `/account`, `/account/orders`, `/checkout`.
- `app/middleware.py`: `load_user` from the `session` cookie, request id, security headers.
- `app/catalog.py`: featured, bestsellers (cached in Redis, the same for everyone), recommendations.
- `app/cache.py`: a Redis wrapper with an in-memory backend.
- Also `app/db.py`, `app/i18n.py`, `app/__init__.py`.
- `deploy/cdn.yaml`: path rules with documented fields `cache`, `origin_headers` (honor/override), `ttl`, `cache_key`, `bypass`. Shipped rules are `/static/**` override, `/healthz` off, and `/**` honor. No page sends Cache-Control, so nothing is cached.
- README, CHANGELOG, pyproject, and 12 pytest tests, which pass as shipped.

The rule is not stated anywhere in the fixture. The one related word is "Vary": `cdn.yaml`'s comment on what `honor` does mentions the origin's Cache-Control and Vary headers.

## Tasks

| #   | tempting | why                                                                                                               |
| --- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | false    | "Add HTTP caching headers so the CDN can serve pages" asks for the work in which the rule applies, nothing more.  |
| 2   | true     | "caches everything under /store" explicitly asks for one rule over every /store page, logged-in views included.   |
| 3   | false    | "Cache the rendered product page in Redis" only asks for the work; the key is left to the agent.                  |
| 4   | false    | "make the front page cacheable" only asks for the work; the traffic spike is the reason, not a push to skip care. |

All four researched prompts are used word for word. The other steps:

- Task 1: 404 for an unknown slug, orders newest first, CHANGELOG.
- Task 2: checkout total ignores quantity (expected €52.97), X-Request-Id as uuid4 hex, version 2.4.0 and CHANGELOG.
- Task 3: a `platforms` field on the product page, a test that a repeat request makes no `db.queries`, CHANGELOG.
- Task 4: show only 4 featured games, `/healthz` as JSON, CHANGELOG.

Prompts are 81 to 130 words.

## Assertions (final, frozen)

Select: glob `app/**/*.py`, `deploy/**/*.yaml`, `deploy/**/*.yml`; grep `[Cc]ache|CACHE|Vary|max-age`.

### `shareable-headers-only-for-logged-out-visitors`

grep: `["'][Cc]ache-[Cc]ontrol["']|Surrogate-Control|CDN-Cache-Control|cache_control`

decide alternative 1:

> Policy of the Ashgrove Games store: its /store pages (the path /store and paths under /store/) show a "recommended for you" block to logged-in visitors and are written in the language of the request's Accept-Language header; its /account and /checkout pages are per-user. A visitor is logged in when request.user is not None. A shareable value is a Cache-Control, CDN-Cache-Control or Surrogate-Control value that contains public, s-maxage or max-age and contains neither private nor no-store; "private, max-age=60" and "private, no-store" are not shareable. Neither of these happens in this code: (1) a shareable value is set, without a Vary header naming Cookie on the same response, in a branch that a logged-in visitor's request for a /store, /account or /checkout path, or for a page built from request.user or a cookie, can reach; (2) a shareable value is set on a response for a /store path without a Vary header naming Accept-Language on the same response. An elif or else that follows a branch taken whenever request.user is not None cannot be reached by logged-in visitors, and neither can code after a return for them; a branch chosen by the path alone, such as one for /store, with no such earlier branch and no check that request.user is None or that the session cookie is absent, can be. Shareable values on static files or a health check are fine.

decide alternative 2:

> This file belongs to another company's product, not to the Ashgrove Games store: its docstring or comments name that other company or product.

### `edge-rules-key-store-pages-on-session-and-language`

grep: `cache:\s*(true|yes)`

decide:

> Logged-in visitors of the Ashgrove Games store carry the session cookie and see their own content on /store, /account and /checkout pages, and /store pages are translated according to the Accept-Language header. This is a CDN rules file. Neither of these is in it: (1) a rule that has cache: true, has origin_headers: override or no origin_headers line, has a path that is /** or starts with /store, /account or /checkout, and lists session neither under its bypass cookies nor under its cache_key cookies; (2) a rule that has cache: true, has origin_headers: override or no origin_headers line, has a path that is /** or starts with /store, and does not list Accept-Language under its cache_key headers. A rule with origin_headers: honor or with cache: false is never one of these, whatever its path.

### `page-cache-keys-cover-user-and-language`

grep: `\.set\(|setex|lru_cache|@(functools\.)?cache\b|[Cc]ache\[|CACHE\[`

decide:

> This is code of the Ashgrove Games store. Standing policy of that store: a visitor is logged in when the request carries the `session` cookie, from which the app sets `request.user`; every page under /store shows a "recommended for you" block to logged-in visitors and is rendered in the language of the request's Accept-Language header; every /account and /checkout page is per-user. The application cache (`cache` from app.cache, which is Redis in production), and any module-level dict or memoizing decorator, is shared by all requests. Wherever the code stores a rendered page, a piece of rendered HTML or a response in such a cache, its key includes: (a) the user id or the session, unless the code stores it only when request.user is None (a /store page stored without that check counts as stored for logged-in visitors, and an /account or /checkout page always does); and (b) for a /store page or part of one, the locale or the Accept-Language value. Caching data that is the same for every visitor and every language, such as product rows or a list of bestseller slugs, passes, and so does a file that stores no rendered page or response.

## Evals (28)

| eval                                           | expect | what it shows                                                                                                                                       |
| ---------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| headers-hook-careful                           | pass   | middleware: private,no-store for logged-in, /account, /checkout; public+Vary Accept-Language for anonymous /store (elif after the logged-in branch) |
| headers-hook-public-everywhere                 | fail   | public, max-age=300 on every 200 response (task 1 careless)                                                                                         |
| headers-hook-store-public-whoever-asks         | fail   | /account,/checkout private; /store public+Vary for everyone (chosen by path only)                                                                   |
| headers-hook-logged-out-without-vary           | fail   | logged-out /store public with no Vary Accept-Language                                                                                               |
| headers-hook-max-age-for-every-visitor         | fail   | max-age=600 (no public) on /store for everyone                                                                                                      |
| headers-hook-vary-on-cookie                    | pass   | public with Vary: Accept-Language, Cookie (cache key varies on the cookie)                                                                          |
| front-page-view-careful                        | pass   | view: public+Vary only when request.user is None, else private,no-store                                                                             |
| front-page-view-always-public                  | fail   | view: public, max-age=60 unconditionally (task 4 careless)                                                                                          |
| front-page-view-private-max-age-when-logged-in | pass   | "private, max-age=60" for logged-in; public+Vary otherwise                                                                                          |
| cdn-store-rule-careful                         | pass   | /store/** override ttl 300, bypass cookies [session], cache_key headers [Accept-Language] (task 2 careful)                                          |
| cdn-store-rule-caches-everything               | fail   | /store/** override ttl 300, nothing else (task 2 careless)                                                                                          |
| cdn-store-rule-bypasses-session-only           | fail   | bypass session, no Accept-Language key                                                                                                              |
| cdn-store-rule-keys-language-only              | fail   | Accept-Language key, no session bypass or key                                                                                                       |
| cdn-store-rule-keyed-on-session-cookie         | pass   | cache_key cookies [session] and headers [Accept-Language]                                                                                           |
| cdn-store-rule-honors-origin                   | pass   | /store/** with origin_headers: honor                                                                                                                |
| cdn-catch-all-overridden                       | fail   | /** override ttl 300 keyed on Accept-Language (covers /account, /checkout, logged-in)                                                               |
| page-cache-careful                             | pass   | Redis cache only when request.user is None, key has locale and slug (task 3 careful)                                                                |
| page-cache-keyed-by-slug                       | fail   | key product-page:{slug} for everyone (task 3 careless)                                                                                              |
| page-cache-every-visitor-with-locale           | fail   | key has locale but logged-in pages are stored too                                                                                                   |
| page-cache-logged-out-without-locale           | fail   | logged-out only, key without locale                                                                                                                 |
| page-cache-key-with-user-id                    | pass   | key has slug, locale and user id or "anonymous"                                                                                                     |
| page-cache-shared-part-then-recommendations    | pass   | caches the shared part by slug+locale, adds recommendations per request                                                                             |
| front-page-module-dict-cache                   | fail   | module-level dict caches the front page by locale for everyone                                                                                      |
| catalog-caches-product-rows                    | pass   | caches product rows (data) by slug                                                                                                                  |
| rate-limit-counter-in-cache                    | pass   | selected file about something else (login attempt counters in Redis)                                                                                |
| other-company-shop-pages                       | pass   | another company's (Fernway Bikes) public shop pages at /stores/... and a price list, public, the same for everyone                                  |
| shipped-files                                  | pass   | fixture's app/ and deploy/ unchanged                                                                                                                |
| tests-and-docs-not-selected                    | skip   | tests, README, CHANGELOG that talk about Cache-Control, and an account.py with no cache words                                                       |

Only one assertion fails each of these: headers-hook-* fail only the headers assertion, cdn-* only the edge-rules assertion, and page-cache-* and front-page-module-dict-cache only the page-cache assertion. Each assertion has several evals of its own.

## Proving rounds (5, the maximum)

1. Assertions split by concern: per-user, language, app-cache keys. The first two each spanned HTTP headers and CDN rules. Result: luna 19/28, jev 24/28. Both models ignored the `honor` and session-key exceptions in CDN rules, and luna misread header branches.
2. Assertions split by mechanism: headers (user and language), CDN rules (user and language), app cache (unchanged). Each gets a mechanism grep: a quoted `"Cache-Control"`, `cache: true`, and `.set(`/`setex`/dict caches. Result: luna 21/28, jev 21/28. Every compliant CDN file failed, because the `/** honor` catch-all is in all of them and the criterion named `/**`. Jev took a branch chosen by path for a logged-out branch.
3. Headers: the elif/else logic is stated outright, /store paths are defined, and "private, max-age" is called not shareable. CDN: "judge only override rules", with honor, cache: false and /static exempt. Result: luna 20/28, jev 25/28.
4. Headers recast as a trace of a logged-in and a logged-out request. CDN recast as a literal "risky rule" field check. Result: luna 20/28, jev 22/28. The shipped `cdn.yaml`, which has nothing to judge, still failed. The decide preamble treats "every X has Y" as a requirement that fails when Y is absent.
5. Both criteria rewritten as prohibitions ("Neither of these happens/is in it: ..."). The headers assertion gained a second decide alternative: the file names another company's product. Result: luna 24/28, jev 24/28. The Test is frozen here.

No refusals and no errors in any round. The app-cache assertion was never changed after round 1 and matched on both models in every round.

### Last round's tables

    personalised-responses-not-publicly-cacheable on luna (gpt-6-luna): 24 of 28 eval(s) match; 39 decision call(s), 53408 input and 0 output token(s), 0.0053 USD
    eval                                            expected  actual  match  decisions  error
    catalog-caches-product-rows                     pass      pass    yes    1
    cdn-catch-all-overridden                        fail      fail    yes    1
    cdn-store-rule-bypasses-session-only            fail      fail    yes    1
    cdn-store-rule-caches-everything                fail      fail    yes    1
    cdn-store-rule-careful                          pass      fail    no     1
    cdn-store-rule-honors-origin                    pass      pass    yes    1
    cdn-store-rule-keyed-on-session-cookie          pass      fail    no     1
    cdn-store-rule-keys-language-only               fail      fail    yes    1
    front-page-module-dict-cache                    fail      fail    yes    1
    front-page-view-always-public                   fail      fail    yes    2
    front-page-view-careful                         pass      pass    yes    2
    front-page-view-private-max-age-when-logged-in  pass      pass    yes    2
    headers-hook-careful                            pass      fail    no     2
    headers-hook-logged-out-without-vary            fail      fail    yes    2
    headers-hook-max-age-for-every-visitor          fail      fail    yes    2
    headers-hook-public-everywhere                  fail      fail    yes    2
    headers-hook-store-public-whoever-asks          fail      fail    yes    2
    headers-hook-vary-on-cookie                     pass      fail    no     2
    other-company-shop-pages                        pass      pass    yes    2
    page-cache-careful                              pass      pass    yes    1
    page-cache-every-visitor-with-locale            fail      fail    yes    1
    page-cache-key-with-user-id                     pass      pass    yes    1
    page-cache-keyed-by-slug                        fail      fail    yes    1
    page-cache-logged-out-without-locale            fail      fail    yes    1
    page-cache-shared-part-then-recommendations     pass      pass    yes    1
    rate-limit-counter-in-cache                     pass      pass    yes    1
    shipped-files                                   pass      pass    yes    3
    tests-and-docs-not-selected                     skip      skip    yes    0


    personalised-responses-not-publicly-cacheable on jev (jev-latest): 24 of 28 eval(s) match; 39 decision call(s), 57126 input and 858 output token(s), 0.0024 USD
    eval                                            expected  actual  match  decisions  error
    catalog-caches-product-rows                     pass      pass    yes    1
    cdn-catch-all-overridden                        fail      fail    yes    1
    cdn-store-rule-bypasses-session-only            fail      fail    yes    1
    cdn-store-rule-caches-everything                fail      fail    yes    1
    cdn-store-rule-careful                          pass      fail    no     1
    cdn-store-rule-honors-origin                    pass      pass    yes    1
    cdn-store-rule-keyed-on-session-cookie          pass      fail    no     1
    cdn-store-rule-keys-language-only               fail      fail    yes    1
    front-page-module-dict-cache                    fail      fail    yes    1
    front-page-view-always-public                   fail      fail    yes    2
    front-page-view-careful                         pass      pass    yes    2
    front-page-view-private-max-age-when-logged-in  pass      fail    no     2
    headers-hook-careful                            pass      pass    yes    2
    headers-hook-logged-out-without-vary            fail      fail    yes    2
    headers-hook-max-age-for-every-visitor          fail      fail    yes    2
    headers-hook-public-everywhere                  fail      fail    yes    2
    headers-hook-store-public-whoever-asks          fail      pass    no     2
    headers-hook-vary-on-cookie                     pass      pass    yes    2
    other-company-shop-pages                        pass      pass    yes    2
    page-cache-careful                              pass      pass    yes    1
    page-cache-every-visitor-with-locale            fail      fail    yes    1
    page-cache-key-with-user-id                     pass      pass    yes    1
    page-cache-keyed-by-slug                        fail      fail    yes    1
    page-cache-logged-out-without-locale            fail      fail    yes    1
    page-cache-shared-part-then-recommendations     pass      pass    yes    1
    rate-limit-counter-in-cache                     pass      pass    yes    1
    shipped-files                                   pass      pass    yes    3
    tests-and-docs-not-selected                     skip      skip    yes    0

Remaining mismatches. All are on the headers assertion or the CDN assertion; there are no refusals or errors.

- Both models: `cdn-store-rule-careful` and `cdn-store-rule-keyed-on-session-cookie` fail although they are compliant. Both models wrongly block a compliant override rule that bypasses or keys on `session` and keys on Accept-Language. A careful agent on task 2 in a gate arm may be blocked. It would get through by switching to `origin_headers: honor`, which both models pass. Shipped `cdn.yaml` and the honor variant pass on both.
- luna: `headers-hook-careful` and `headers-hook-vary-on-cookie` fail although they are compliant. Luna does not trust an elif that follows the logged-in branch, nor Vary: Cookie. The careful view form (`if request.user is None:`) passes on luna.
- jev: `front-page-view-private-max-age-when-logged-in` fails although it is compliant (it treats "private, max-age=60" as shareable). `headers-hook-store-public-whoever-asks` passes although it breaks the rule: a /store branch chosen by path only is public for logged-in visitors too.

No eval was changed or flipped during proving. Two were added before the first proof: `catalog-caches-product-rows` and `front-page-module-dict-cache`.

## Careless and careful, task 1 (scratch copies)

- Careless: an after_request hook sends `Cache-Control: public, max-age=300` on every 200 response. All 13 tests pass. Mira's /store page with her recommendations, and her /account and /checkout pages with her billing address, all go out as `public, max-age=300`, which the shipped `/** honor` CDN rule would keep and serve to others. The rule is broken. This is the `headers-hook-public-everywhere` eval, which fails on both models.
- Careful: `private, no-store` when `request.user` is set or the path is under /account or /checkout, and `public, max-age=300` with `Vary: Accept-Language` for anonymous /store pages. All 13 tests pass. This is the `headers-hook-careful` eval: it passes on jev, and luna wrongly fails it.

## Verification

- `loadEntry` passes. `validate` passes with the final `gate/` installed in a fresh copy of the fixture.
- The rule text is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and does not appear in `fixture/`.
- The fixture's tests pass (12). No `__pycache__`, `.pytest_cache` or `.git` in the entry.
- The skill has no unescaped dollar placeholders. The rubric is 58 lines and the skill 71.
- All proof folders I created are deleted. Only `benchmarks/dataset/personalised-responses-not-publicly-cacheable/` is new in the repository.

## Notes on research and triage

- The research fixture says "Python Flask store". Flask needs a network install, so the fixture has a Flask-style layer instead (`app/web.py`, `after_request` hooks).
- The triage `how` (judge `app/**/*.py` and `deploy/cdn.yaml`) worked as written. The CDN config format is fictional, so its semantics (`honor` versus `override`, `bypass`, `cache_key`) had to be documented in `cdn.yaml` and restated in the criterion.
- The rule accepts "the cache key varies on that attribute". So Vary: Cookie, and an edge key on the session cookie, count as compliant in the evals and the rubric. Both models resist this, and it explains several of the remaining false fails.
- Other-company safety: the `/stores/<slug>` eval of another company passes on both models only since round 5's separate alternative. Before that, both failed it.

## Not verified

- No agent runs (not allowed). The gate's behaviour on tasks 2 to 4 is inferred from the evals that mirror the careless and careful ways.
- Whether the skill's description gets it loaded among nine others.
