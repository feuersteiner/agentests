# ha-direct-key-access-after-validation: build report

Status: done. Entry at benchmarks/dataset/ha-direct-key-access-after-validation/ (dev, research/dev-conventions.yaml, verdict restate-policy).

## Final rule text

When a schema or validator already guarantees that a key is present, read it with direct indexing (`data["key"]`) rather than `.get()` or a fallback default, so a broken contract fails loudly instead of being silently masked; `.get()` stays for keys that are genuinely optional.

- Webhook handlers (the `handle_*` functions under `hooks/`) only receive events that `validate_event` in `hooks/schemas.py` has accepted, and it rejects any event that lacks a required key. Every event has the keys `id`, `type`, `created` and `data`.
- The keys of `data` that each event type requires, and the ones that are optional:
  - `charge.succeeded` requires `charge_id`, `customer_id`, `amount` and `currency`; `description` is optional.
  - `customer.created` requires `customer_id` and `email`; `name` is optional.
  - `customer.updated` requires `customer_id` and `email`; `name` and `tax_id` are optional.
  - `invoice.paid` requires `invoice_id`, `amount` and `currency`.
  - `refund.created` requires `refund_id`, `charge_id` and `amount`; `note` is optional.
  - `subscription.cancelled` requires `subscription_id`, `reason` and `effective_date`; `feedback` is optional.

The research rule sentence is kept, with code spans added around data["key"] and .get(). The standing policy is the triage's two policy_facts: handlers only see validated events, and the required and optional keys of each event type.

## Fixture

pennywren-webhooks, a fictional Python webhook service (Quillpay events): README.md, CHANGELOG.md, pyproject.toml, .gitignore, hooks/(schemas.py, handlers.py, store.py, app.py), scripts/(replay.py, sample-events.jsonl), tests/(conftest.py, test_schemas.py, test_handlers.py, test_app.py). 14 pytest tests pass as shipped. schemas.py already defines all six event types, including tax_id as optional on customer.updated, so no task needs a schema edit (triage note). Shipped handlers index required keys and use .get() / an "in" check only for optional keys (description, name).

## Assertions (gate/test.yaml)

```yaml
version: 1
id: ha-direct-key-access-after-validation
title: Direct key access after validation
description: Webhook handlers index the keys that validation guarantees and keep .get(), presence checks and KeyError handling for optional keys.
select:
  glob: 'hooks/**/*.py'
  grep: 'def handle_\w+\('
assert:
  - id: no-get-on-guaranteed-key
    description: No handler reads a guaranteed key with .get().
    error: Index the keys validation guarantees, such as event["data"] and data["amount"]; keep .get() for the optional keys.
    grep: '\.get\(\s*(["''](id|type|created|data|charge_id|customer_id|amount|currency|email|invoice_id|refund_id|subscription_id|reason|effective_date)["'']|[A-Za-z_]\w*\s*[,)])'
    decide: 'In the functions whose names start with handle_, .get() is called on the event parameter or on the dict taken from it (event["data"], usually held in a variable named data) only to read these optional keys: "description", "name", "tax_id", "note", "feedback". A .get() call on a different object, such as a store table or a record read from the store, is outside this condition and never breaks it, even when it uses one of the key names below. One single .get() call, with or without a default value, on the event or on the dict taken from it for any other key breaks this condition, even when all the other keys are read with square brackets. The other keys are "id", "type", "created", "data", "charge_id", "customer_id", "amount", "currency", "email", "invoice_id", "refund_id", "subscription_id", "reason" and "effective_date". A call such as data.get(key), where the variable key can hold one of these other keys, breaks the condition too.'
  - id: no-presence-check-on-guaranteed-key
    description: No handler tests whether a guaranteed key is present.
    error: Validation guarantees this key, so drop the presence check and its fallback and index the key directly.
    grep: '["''](id|type|created|data|charge_id|customer_id|amount|currency|email|invoice_id|refund_id|subscription_id|reason|effective_date)["'']\s+(not\s+)?in\s+[A-Za-z_]'
    decide: 'In the functions whose names start with handle_, a presence test with "in" or "not in" on the event parameter or on the dict taken from it (event["data"], usually held in a variable named data) is made only for these keys: "description", "name", "tax_id", "note", "feedback". A presence test for any other key of the event or of that dict, for example "amount" in data, breaks this condition.'
  - id: no-keyerror-catch-on-guaranteed-key
    description: No handler catches the KeyError of a guaranteed key.
    error: Validation guarantees this key, so let a missing key raise instead of catching the error and carrying on.
    grep: '\bexcept\b'
    decide: 'No function whose name starts with handle_ wraps in try/except a read of one of these keys from the webhook event or its data dict, catching KeyError or a broader exception such as Exception: "id", "type", "created", "data", "charge_id", "customer_id", "amount", "currency", "email", "invoice_id", "refund_id", "subscription_id", "reason", "effective_date".'
```

The first two greps are precise (a .get( whose first argument is a required key literal or a bare variable; a presence test on a required key literal), so the shipped file and careful work clear locally without a model call, and decide only clears false alarms (a .get() on a store table or store record).

## Evals (19)

- shipped-handlers: pass (fixture's hooks/handlers.py unchanged)
- careful-invoice-paid: pass (task 1 careful)
- careless-invoice-paid: fail (task 1 careless: event.get("data", {}), .get with defaults)
- careful-subscription-cancelled: pass (required keys indexed, optional feedback via .get)
- careless-subscription-cancelled: fail (.get("reason", ""), .get("effective_date"))
- refund-get-without-default: fail (.get() on required keys, no default; only assertion 1)
- single-currency-default: fail (one data.get("currency", ...) among direct reads; only assertion 1)
- envelope-read-with-get: fail (event.get("data") or {}, event.get("created"))
- tax-id-task-rewrites-required-reads: fail (task 3 careless: loop data.get(field) over email, name, tax_id)
- optional-tax-id-with-get: pass (task 3 careful)
- optional-tax-id-with-in-check: pass (task 3 careful, "tax_id" in data)
- presence-check-with-default: fail (only assertion 2: "reason" in data ... else default)
- keyerror-swallowed: fail (only assertion 3: try/except KeyError around required keys)
- refund-store-lookup-with-get: pass (store.charges.get(data["charge_id"]) is not an event read)
- refund-store-lookup-by-variable: pass (store.charges.get(charge_id); added in round 3)
- store-record-read-with-get: pass (charge.get("amount", 0) on a store record; added in round 3)
- new-handlers-in-their-own-module: pass (hooks/billing_handlers.py, lookup dict .get)
- git-hook-script-is-about-something-else: pass (hooks/pre_push.py, a git hook with handle_sigint and os.environ.get; selected, unrelated)
- schemas-app-and-tests-not-selected: skip (hooks/schemas.py, hooks/app.py, tests/, a handlers.py outside hooks/, hooks/README.md)

## Tempting tags

- 1: false. Asks only for the invoice.paid handler.
- 2: false. Asks only for the refund.created handler.
- 3: false. "Save it when it is present" points at the compliant optional read; nothing pushes toward fallbacks on required keys.
- 4: false. Asks only for the subscription.cancelled handler.

All four researched prompts are used word for word; none was changed. Each long prompt has 4 or 5 steps (90 to 129 words) with the researched prompt as step 2; the other steps touch app.py, store.py, conftest.py, scripts/replay.py, tests, README, CHANGELOG and pyproject.toml.

## Task 1 done both ways (scratch copies, no model)

- Careless (data = event.get("data", {}), .get("amount", 0), .get("currency", "EUR"), silent return for an unknown invoice), with the dispatch fix, tests, README and CHANGELOG: 16 tests pass, the file is selected, and assertion 1's grep matches, so it goes to the model. The eval careless-invoice-paid holds the same handler (lookup written on two lines), and both models fail it, so the commit would be blocked.
- Careful (direct indexing throughout): 16 tests pass, the file is selected and no assertion grep matches, so it passes with no model call (as eval careful-invoice-paid, which also stores paid_at).

## Proving rounds: 5

1. First Test (2 assertions, long criteria with the whole schema as background, broad greps): luna 11/17, jev 13/17. Both models passed most violating files.
2. Split into 3 assertions (.get, presence test, KeyError catch) with shorter criteria listing the 14 guaranteed keys and the allowed exceptions: luna 10/17, jev 14/17.
3. Made the greps of assertions 1 and 2 precise (required key literals, or a bare variable argument for .get) and rephrased the criteria around the five optional keys ("only to read these keys"). Added two evals for cases the precise grep now sends to the model: refund-store-lookup-by-variable and store-record-read-with-get (both expect pass). luna 16/19, jev 18/19 (jev failed store-record-read-with-get).
4. Assertion 1's criterion: moved the "other object" exemption before the breaking sentence, added "one single .get() call ... breaks", listed the 14 other keys. luna 17/19, jev 18/19.
5. Assertion 1's criterion: added "with or without a default value" and a sentence on a key held in a variable. luna 17/19, jev 18/19. Frozen here.

No eval was deleted, flipped or edited after it was first written; two were added in round 3. No refusals and no errors in any round.

## Last round's tables

```text
Proof folder: /tmp/agentests-benchmark/prove-2026-11-23T07-47-48-982Z
Proving ha-direct-key-access-after-validation on luna: 19 eval(s)
ha-direct-key-access-after-validation on luna (gpt-6-luna): 17 of 19 eval(s) match; 10 decision call(s), 13144 input and 0 output token(s), 0.0013 USD
eval                                     expected  actual  match  decisions  error
careful-invoice-paid                     pass      pass    yes    0
careful-subscription-cancelled           pass      pass    yes    0
careless-invoice-paid                    fail      fail    yes    1
careless-subscription-cancelled          fail      fail    yes    1
envelope-read-with-get                   fail      fail    yes    1
git-hook-script-is-about-something-else  pass      pass    yes    0
keyerror-swallowed                       fail      fail    yes    1
new-handlers-in-their-own-module         pass      pass    yes    0
optional-tax-id-with-get                 pass      pass    yes    0
optional-tax-id-with-in-check            pass      pass    yes    0
presence-check-with-default              fail      fail    yes    1
refund-get-without-default               fail      fail    yes    1
refund-store-lookup-by-variable          pass      pass    yes    1
refund-store-lookup-with-get             pass      pass    yes    0
schemas-app-and-tests-not-selected       skip      skip    yes    0
shipped-handlers                         pass      pass    yes    0
single-currency-default                  fail      pass    no     1
store-record-read-with-get               pass      pass    yes    1
tax-id-task-rewrites-required-reads      fail      pass    no     1

Proving ha-direct-key-access-after-validation on jev: 19 eval(s)
ha-direct-key-access-after-validation on jev (jev-latest): 18 of 19 eval(s) match; 10 decision call(s), 13727 input and 220 output token(s), 0.0006 USD
eval                                     expected  actual  match  decisions  error
careful-invoice-paid                     pass      pass    yes    0
careful-subscription-cancelled           pass      pass    yes    0
careless-invoice-paid                    fail      fail    yes    1
careless-subscription-cancelled          fail      fail    yes    1
envelope-read-with-get                   fail      fail    yes    1
git-hook-script-is-about-something-else  pass      pass    yes    0
keyerror-swallowed                       fail      fail    yes    1
new-handlers-in-their-own-module         pass      pass    yes    0
optional-tax-id-with-get                 pass      pass    yes    0
optional-tax-id-with-in-check            pass      pass    yes    0
presence-check-with-default              fail      fail    yes    1
refund-get-without-default               fail      fail    yes    1
refund-store-lookup-by-variable          pass      pass    yes    1
refund-store-lookup-with-get             pass      pass    yes    0
schemas-app-and-tests-not-selected       skip      skip    yes    0
shipped-handlers                         pass      pass    yes    0
single-currency-default                  fail      fail    yes    1
store-record-read-with-get               pass      pass    yes    1
tax-id-task-rewrites-required-reads      fail      pass    no     1

Proof: /tmp/agentests-benchmark/prove-2026-11-23T07-47-48-982Z/proof.json

```

Remaining mismatches (both are misses in the lenient direction, on assertion 1):

- single-currency-default on luna: expected fail, got pass. One data.get("currency", invoice["currency"]) among direct reads.
- tax-id-task-rewrites-required-reads on luna and jev: expected fail, got pass. The required key email is read through data.get(field) in a loop over a tuple of names; neither model follows the variable.

## What did not work as written, and limits

- Triage "how" says to judge hooks/handlers.py; the Test selects any hooks/**/*.py that defines a handle_ function, so a handler put in a new module is judged too.
- pop() and setdefault() with a default on a required key, and an early return on a falsy required value, are not checked by the Test (kept to three narrow assertions); the rubric covers them.
- A schema loosened in hooks/schemas.py is not seen by the Test (triage note); the rubric tells the judge to treat it as a fallback.
- The first two assertions rely on handlers reading keys as string literals (or a bare variable for .get); a presence test on a key held in a constant would clear locally.
- Task 3 gives little chance to break the rule: the compliant read of tax_id is .get() or an "in" check. It is broken only by rewriting the required reads (as in the loop eval, which both models miss).
- Not verified: no agent ran, so whether an untold agent actually writes fallbacks in this fixture is unknown (the shipped handlers show the direct-indexing style). How the Test behaves in the nine other entries' fixtures was checked only through its glob and grep (no other fixture present today has a hooks/ folder) and the unrelated-file eval.
- A built-in safety check refused one scratch cleanup command (rm with shell variables); scratch copies task1-careless, task1-careful, fresh and compile remain under the scratch work folder, outside the repository. All five proof folders are deleted.
- Checked: loadEntry passes; validate passes with the final gate in a fresh fixture copy; no skill placeholder; rule text word for word in SKILL.md, TEST.md and rubric.md and absent from fixture/; rubric 59 lines; skill 84 lines; no cache left in the entry; only this entry's folder was written in the repository.
