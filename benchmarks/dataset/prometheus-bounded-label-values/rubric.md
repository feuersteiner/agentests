# Rubric: metric labels take bounded values

## The rule

Metric labels only take values from a small bounded set; unbounded values such as user or customer ids, emails, order ids, raw URLs or exception messages never become label values.

- A bounded set is small and fixed when the code is written, such as a plan, a route template, an HTTP method, a status class, or an error code or reason from a fixed list.
- Detail about one user, customer, order, cart or row, and free text such as an error message, goes in a log line, not in a label.

## What to look at

The repository is a Python shop API whose metrics library has the `prometheus_client` API:
`Counter`, `Gauge` and `Histogram` take a name, a help text and a list of label names, and
`.labels(...)` picks the series for one set of values. Before the agent started, every metric was
bounded; each user had a `plan` (`free`, `plus` or `family`), each route a template such as
`/cart/items/<sku>`, and payment declines and the importer's row errors each an `exc.code` from a
short fixed list, while their messages carry line numbers, SKUs and prices. For every metric the
diff adds or changes, wherever it is declared or recorded, list each label and ask:

1. **What values can it take?** Follow each `.labels(...)` argument back to where it comes from.
   A plan, a route template, an HTTP method, a status class, an outcome, a size or age bucket, an
   exception class or a code from a fixed list is bounded. A user, customer, cart, order, payment
   or row id, an email, the request path or URL, `str(exc)` or any message is not, whatever the
   label is called.
2. **Is the value clamped?** A code mapped into a fixed list, with an `other` for the rest, is
   bounded. A value that is small today but open-ended (a free-text field) is a borderline lapse.
3. **Where did the per-entity detail go?** Which customer, which row and why, which user's cart
   belong in a log line, not in a label.

Several prompts ask for a breakdown the rule forbids as a label: "which customers", "by error
message", "each user's cart". A diff that gives the bounded breakdown instead (by decline code and
plan, by error code, by cart size or idle-time bucket, or an unlabelled total) and logs the
per-entity detail has done the task. A diff that labels by the id or the message has broken the
rule however well it does the rest. Tests the agent wrote are not graded against the rule; the
prompt's other steps count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the metric's main breakdown is unbounded: a label holds a customer or user id, an
  email, the raw path, or the exception message.
- **4 to 6**: one unbounded label among bounded ones, or a bounded metric that is also recorded
  with an unbounded value somewhere, or a bounded metric added beside a second, per-user one.
- **7 to 9**: every new label is bounded, with a minor lapse such as one borderline, unclamped
  value; or the rule is fully followed and a step of the task is missing or half done.
- **10**: every step is done, every new label takes values from a small fixed set, and the
  per-entity detail is logged rather than labelled.

What each looks like:

- **2**: `Counter("payment_failures_total", "...", ["customer_id"])` recorded with
  `.labels(customer_id=str(user.id))`; or `.labels(error=str(exc))` in the importer; or a cart
  gauge set with `.labels(user_id=str(cart.user_id))`.
- **5**: failed payments labelled by `reason=exc.code` and `plan=user.plan` and also `customer`;
  or a latency histogram declared with `route` and `plan` but recorded with `route=request.path`.
- **8**: labels by decline code and plan with the customer id in the warning log, but the README
  or CHANGELOG step was skipped, or one label is an unclamped value that is small today.
- **10**: for example latency recorded with `route=template` and the user's plan, or importer
  errors counted by `code=exc.code` with the message still logged; all other steps are done.
