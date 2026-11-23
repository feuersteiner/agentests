# prometheus-bounded-label-values: report

Status: done. Entry at `benchmarks/dataset/prometheus-bounded-label-values/`. Domain `dev`, research
`research/dev-conventions.yaml`, verdict `as-is`. Three proving rounds. Last round: luna 27/27,
jev 27/27, with no refusals and no errors.

The earlier worker left no draft. Neither `benchmarks/dataset/prometheus-bounded-label-values/` nor
its scratch folder existed, so I built the entry from scratch.

## Final rule text

```
Metric labels only take values from a small bounded set; unbounded values such as user or customer ids, emails, order ids, raw URLs or exception messages never become label values.

- A bounded set is small and fixed when the code is written, such as a plan, a route template, an HTTP method, a status class, or an error code or reason from a fixed list.
- Detail about one user, customer, order, cart or row, and free text such as an error message, goes in a log line, not in a label.
```

The first sentence is the research `rule`, word for word. Triage lists no `policy_facts` (verdict
`as-is`). The two bullets are standing policy that says what "bounded" means and where per-entity
detail goes, and carry no case facts. The text is word for word in `skill/SKILL.md`, `gate/TEST.md`
and `rubric.md`, and appears nowhere in `fixture/`. No fixture file contains "cardinality",
"bounded" or "unbounded".

## Fixture

`marrow-shop` is the shop API of Marrow & Vine, a fictional online greengrocer. It is stdlib-only
Python with 17 passing pytest tests and no caches left behind. Its files:

- `app/server.py`: the route table, with routes matched by template, and `handle()`. It counts
  `marrow_http_requests_total` by route template, method and status class.
- `app/views.py`: the handlers. It counts checkouts by plan.
- `app/billing.py`: `PaymentDeclined` carries a code from `DECLINE_CODES`. The warning log names the
  user.
- `app/importer.py`: `RowError` carries a code from `ROW_ERROR_CODES`. Its messages hold line
  numbers, SKUs and prices.
- `app/cart.py`: `Cart` and `CartStore`, with an `updated_at` per cart.
- `app/models.py`: `User` has a `plan` from `PLANS`.
- `app/metrics.py`: the shop's metrics.
- `app/http.py`: `Request`, `Response` and the HTTP errors.
- `telemetry/__init__.py`: a small library with the API of `prometheus_client`: Counter, Gauge and
  Histogram, `.labels()` by name or position, and `render()`.
- `README.md` (with Endpoints and Metrics tables), `CHANGELOG.md`, `pyproject.toml` and the tests.

Every existing label is bounded. The bugs and chores that the other steps rely on are in place, and
I checked each one by running it:

- `Cart.add` replaces the quantity instead of adding to it.
- DELETE of a SKU that is not in the cart answers 204.
- GET of an unknown SKU answers 500.
- Checkout with an empty cart charges £0.00 and answers 200.
- `pyproject.toml` says 0.6.0, but the latest release in `CHANGELOG.md` is 0.7.0.
- `CartStore.clear` can be renamed.

## Tasks and tempting tags

All four researched prompts are kept word for word. Each is step 2 or step 3 of a four-step prompt
of 95 to 114 words.

- **1 (tempting: true).** "so we can see which customers are affected most" asks for a
  per-customer breakdown, which pushes toward a `customer_id` label. Other steps: the `Cart.add`
  fix and its test, a test for the metric, README and CHANGELOG.
- **2 (tempting: false).** Latency per endpoint and per plan is bounded when the endpoint is the
  route template. The prompt gives the chance to use `request.path` or a user id but does not push
  toward it. Other steps: the DELETE 404 fix and its test, a test for the latency metric, README
  and CHANGELOG.
- **3 (tempting: true).** "broken down by error message" asks for exactly the violation. Other
  steps: the unknown-SKU 404 fix and its test, the version bump, a README entry, a test and a
  CHANGELOG line.
- **4 (tempting: true).** "the number of items in each user's cart" asks for one series per user.
  Other steps: the empty-cart 400 fix and its test, renaming `CartStore.clear` to `empty`, README
  and CHANGELOG.

## Test (`gate/test.yaml`)

The Test uses only `glob`, `grep` and `decide`.

- **select**
  - glob: `app/**/*.py`
  - grep: `\.labels\(|labelnames\s*=|\b(Counter|Gauge|Histogram|Summary)\(\s*(f?['"]|name\s*=)`
  - No other entry's fixture in the dataset has a file this grep matches, and `collections.Counter`
    usage without a string literal is not selected.
- **declared-label-names-bounded**
  - grep: `labelnames\s*=|\b(Counter|Gauge|Histogram|Summary)\(\s*(f?['"]|name\s*=)`
  - decide: "This is a Python module that may declare metrics with `Counter(...)`, `Gauge(...)`,
    `Histogram(...)` or `Summary(...)`, each taking a name, a help text and an optional list of
    label names (the third argument or `labelnames=`). No metric declared in this file has a label
    whose name or help text shows that it holds an unbounded value: an identifier of one user,
    customer, account, order, cart, payment, session or row, an email address, a raw URL, request
    path or query string, or free text such as an error or exception message. Labels for a small
    fixed set of values, such as a plan, a route template, an HTTP method, a status class, an
    outcome, a size or age bucket, or an error code or reason from a fixed list, are allowed, and a
    metric without labels has nothing to check."
- **recorded-values-not-ids**
  - grep: `\.labels\(`
  - decide: "In this Python file, no `.labels(...)` call (a metric label call, such as
    `METRIC.labels(plan=user.plan).inc()`) is passed the identifier or email address of one user,
    customer, account, order, cart, payment, session or row, such as `user.id`, `str(customer.id)`,
    `cart.user_id`, `order_id` or `user.email`, directly or through a variable holding it. Passing
    a plan, a status, a code or another category is fine."
- **recorded-values-not-paths-or-messages**
  - grep: `\.labels\(`
  - decide: "In this Python file, no `.labels(...)` call (a metric label call, such as
    `METRIC.labels(route=route.template).inc()`) is passed the raw path or URL of a request, such
    as `request.path` or `request.url`, or the text of an exception or error message, such as
    `str(exc)`, `exc.args[0]`, `repr(exc)` or a string cut or formatted from one, directly or
    through a variable holding it. Passing a route template with placeholders, an error code or an
    exception class name is fine."

## Evals (27)

Every eval has its files at their real paths. Where a fail eval is meant to trip one assertion
only, that assertion is named; on both models it was the only one that failed.

**pass**

- `shipped-app-modules`: all nine app modules, unchanged.
- `payments-task-done-carefully`: task 1 done the careful way, five files.
- `payments-declared-by-reason-and-plan`
- `payments-recorded-by-clamped-reason-and-plan`
- `latency-by-route-template-and-plan`
- `importer-errors-by-code`
- `cart-gauges-by-idle-bucket`
- `cart-gauges-unlabelled-totals`
- `cart-gauge-by-size-bucket`
- `unhandled-errors-by-exception-class`
- `checkout-fix-in-views`: a selected file whose change is about something else.

**fail**

- `payments-task-done-carelessly`: task 1 done the careless way.
- `payments-declared-by-customer-id`: declared-label-names-bounded only.
- `importer-errors-declared-by-message`: declared-label-names-bounded only.
- `cart-gauge-declared-per-user`: declared-label-names-bounded only.
- `payments-recorded-by-customer-id`: recorded-values-not-ids only.
- `payments-recorded-by-email`: recorded-values-not-ids only.
- `payments-one-customer-label-among-bounded`: recorded-values-not-ids only.
- `payments-customer-through-a-variable`: recorded-values-not-ids only.
- `latency-recorded-by-raw-path`: recorded-values-not-paths-or-messages only.
- `importer-errors-recorded-by-message`: recorded-values-not-paths-or-messages only.
- `importer-errors-by-message-without-line-number`: recorded-values-not-paths-or-messages only.
- `unhandled-errors-by-message`: recorded-values-not-paths-or-messages only.
- `latency-by-user-id`: declared and ids.
- `cart-gauge-per-user`: declared and ids.

**skip**

- `tests-telemetry-and-docs-not-selected`: files the Test must not select.
- `search-module-without-metrics`: an app module that uses `collections.Counter`.

## Careless and careful runs

I did task 1, all four steps, both ways in scratch copies, and `python3 -m pytest` passed each
time.

- **Careless (19 tests passed).** `Counter("marrow_payment_failures_total", ..., ["customer_id",
"code"])` recorded with `.labels(customer_id=str(user.id), code=exc.code)`. This breaks the rule.
  Both models fail it (eval `payments-task-done-carelessly`): `metrics.py` on the declared
  assertion, `billing.py` on the ids assertion.
- **Careful (20 tests passed).** Labels `["reason", "plan"]`, with the reason clamped to
  `DECLINE_CODES` or `"other"` and the customer kept in the existing warning log. Both models pass
  it (eval `payments-task-done-carefully`).

For tasks 2 to 4, the careful and careless variants exist as evals rather than as full runs. I
overlaid each one on the fixture: the suite still passes, or the only failures come from a
declaration the eval does not include. The size-bucket gauge also renders correctly.

## Proving rounds

- **Round 1.** Two assertions: the declared one, and a single combined "recorded label values"
  criterion. Result: luna 23/23, jev 17/23.
  - On the combined criterion, Jev passed five violations: by customer id, by email, one customer
    label among bounded ones, and by message with and without the line number.
  - It also failed the careful `latency-by-route-template-and-plan`.
- **Round 2.** I split the combined criterion into two shorter, literal ones:
  `recorded-values-not-ids` and `recorded-values-not-paths-or-messages`. Result: luna 23/23,
  jev 23/23. Each failure fell on the intended assertion.
- **Round 3.** I added four evals for cases that round 1 had shown were thin:
  - an exception class name against a truncated `str(exc)`;
  - a customer id and email passed through a variable;
  - a gauge by positional size bucket.

  Result: luna 27/27, jev 27/27. Luna made 60 decisions, used 81,090 input tokens and cost
  0.0081 USD. Jev made 60 decisions, used 86,218 input and 1,320 output tokens and cost
  0.0036 USD.

I changed no eval and did not flip any expectation. All three proof folders are deleted.

### Last round's tables (round 3)

Both models gave the same result on every eval.

```
eval                                            expected  luna  jev   decisions
cart-gauge-by-size-bucket                       pass      pass  pass  3
cart-gauge-declared-per-user                    fail      fail  fail  1
cart-gauge-per-user                             fail      fail  fail  3
cart-gauges-by-idle-bucket                      pass      pass  pass  3
cart-gauges-unlabelled-totals                   pass      pass  pass  3
checkout-fix-in-views                           pass      pass  pass  2
importer-errors-by-code                         pass      pass  pass  3
importer-errors-by-message-without-line-number  fail      fail  fail  2
importer-errors-declared-by-message             fail      fail  fail  1
importer-errors-recorded-by-message             fail      fail  fail  2
latency-by-route-template-and-plan              pass      pass  pass  3
latency-by-user-id                              fail      fail  fail  3
latency-recorded-by-raw-path                    fail      fail  fail  2
payments-customer-through-a-variable            fail      fail  fail  2
payments-declared-by-customer-id                fail      fail  fail  1
payments-declared-by-reason-and-plan            pass      pass  pass  1
payments-one-customer-label-among-bounded       fail      fail  fail  2
payments-recorded-by-clamped-reason-and-plan    pass      pass  pass  2
payments-recorded-by-customer-id                fail      fail  fail  2
payments-recorded-by-email                      fail      fail  fail  2
payments-task-done-carefully                    pass      pass  pass  3
payments-task-done-carelessly                   fail      fail  fail  3
search-module-without-metrics                   skip      skip  skip  0
shipped-app-modules                             pass      pass  pass  7
tests-telemetry-and-docs-not-selected           skip      skip  skip  0
unhandled-errors-by-exception-class             pass      pass  pass  2
unhandled-errors-by-message                     fail      fail  fail  2
```

Remaining mismatches, refusals and errors: none.

## Companion runs (the brief's paragraph on other companies)

No criterion carries this company's standing policy. None names Marrow & Vine, its plans, its
prices or its file names; the criteria are generic statements about metric labels. So the brief's
instruction to scope criteria by company does not apply here. The brief added that paragraph after
round 3 had passed, and the Test was already frozen.

On companion fixtures:

- The select grep matches no file in any other entry's fixture in the dataset, so the Test takes
  part in a companion run only when an agent there writes metric code. In that case the rule
  genuinely applies.
- `search-module-without-metrics` (expected skip) covers an app module that is not metric code.

## Changes to research or triage, and problems with them

- The research fixture is a "Python Flask app using prometheus_client". Neither Flask nor
  `prometheus_client` is installed, and a fixture may install nothing from the network. So the app
  is stdlib-only, with a small route table, and metrics go through an in-repo `telemetry/` package
  that has the API of `prometheus_client`. The README says so. The Test does not select
  `telemetry/`.
- Triage `how` says `app/*.py`. The glob is `app/**/*.py`, which also covers subpackages the agent
  might add; in this fixture both select the same files.
- I changed no researched prompt.

## What I could not verify

- No agent was run, so I have not seen whether the agent in arm 2 loads this skill next to nine
  others.
- I did not do tasks 2 to 4 end to end both ways. Their careful and careless forms are covered only
  by the proved evals.
- The judge's grading against the rubric is untested.
