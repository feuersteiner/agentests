# payment-retry-reuses-idempotency-key

Entry: `benchmarks/dataset/payment-retry-reuses-idempotency-key/` (dev, `research/dev-incidents.yaml`, verdict `as-is`).
Status: built and verified. The Test was frozen after the fifth proving round, which still had mismatches (see Proving).

## Final rule text

```
A retry of the same logical payment operation must send the same idempotency key as the first attempt, so the key must come from a record that survives the failed attempt, never be generated fresh for each attempt.

- The provider calls are `provider.capture()` and `provider.refund()` from `src/payments/provider.ts`. Each takes an `idempotencyKey`, and the provider answers a key it has seen before with the first request's result instead of moving money again.
- The record is the one that stands for the operation, such as a capture record kept through `src/payments/repo.ts`, and its id or a key stored on it is the idempotency key. It survives a failed attempt when no error path deletes it, so a retry can find it and send the same key.
- `repo.createCapture()` makes a new record with a new id each time it is called, and so does `capturePayment(paymentId, amount)` in `src/payments/service.ts`: calling either of them again to retry a failed capture sends a new key.
- A key generated in the code, such as `randomUUID()`, a timestamp or an attempt number, or one built from the payment id and amount, does not come from the operation's record, even when it is generated once and reused across a retry loop.
```

The third bullet is the standing fact the triage note asks for, for the background-job task. The fourth bullet makes "must come from a record" concrete. Its last clause, that a key built from the payment id and amount does not count, is my own reading of the research grading note ("a different operation or amount gets a different key"). Such a key is stable across retries, but two separate refunds of the same amount would share it. The rubric scores it 4 to 6, and the gate fails it.

## Fixture

`fernhill-payments`, a Bun/TypeScript capture service for a fictional grocer. It has 14 files:

- `README.md`, `CHANGELOG.md`, `package.json` and `.gitignore`.
- `src/money.ts` (`formatAmount`).
- In `src/payments/`: `provider.ts` (the `PaymentProvider` interface with `capture` and `refund`, plus `ProviderError` and `ProviderTimeoutError`), `repo.ts` (in-memory payment and capture records, with ids from `randomUUID()`) and `service.ts` (`createPaymentService` returning `capturePayment` and `paymentStatus`). `capturePayment` creates a pending capture and sends `capture.id` as the key. It has no failure handling, so a failed call leaves the capture pending.
- In `src/jobs/`: `index.ts` (`paymentJobs` and `startJobs`) and `settlement.ts`.
- In `test/`: `fake-provider.ts`, which dedupes by key and has `failNext`, and the three test files `money.test.ts`, `service.test.ts` and `settlement.test.ts`.

`bun test` passes as shipped: 8 tests. No cache is left behind. The research fixture said Vitest; I used `bun test` instead, because nothing may be installed from the network. The fixture deliberately ships no `failed` capture status and no `deleteCapture`. Task 3 then chooses between deleting the record and marking it failed. Task 4 has to decide what a "failed capture" is: in the shipped code it is a capture left pending.

## Assertions (`gate/test.yaml`)

The select step:

- glob: `src/**/!(*.test|*.spec).ts`. This is an extglob that leaves out test files under `src/`, because `!` negation is not supported.
- grep: `[Ii]dempoten|capturePayment|refundPayment|create(Capture|Refund)|provider\.(capture|refund)\(`

No other entry's fixture matches the select grep. The triage's `how` says `src/payments/*.ts`. I widened the path to `src/**` behind the content grep so that a retry job placed in `src/jobs/` is still judged.

1. `key-from-record`
   - grep: `[Ii]dempoten`
   - decide: 'No call to provider.capture or provider.refund passes an idempotencyKey that the code generates itself instead of reading it from a stored record. A generated key is one made with randomUUID(), Date.now() or another random or clock value, from an attempt or retry counter, or built from the payment id and amount; it counts as generated even when it is made once and then reused across a retry loop. The id of a capture, refund or other record created in or loaded from the repository before the call, or a key field stored on that record, is not generated, also when a fixed prefix is added to it. A file that makes no provider call passes.'
2. `failure-keeps-record`
   - grep: `[Dd]elete|[Rr]emove|splice|filter\(|[Dd]iscard|[Pp]urge|[Dd]rop|[Cc]lean|[Rr]ollback|[Rr]evert|[Uu]ndo`
   - decide: 'No code that runs because a provider.capture or provider.refund call failed, such as a catch block, a .catch() handler, or a finally block or branch that runs when the call threw or rejected, deletes or removes the capture, refund or other record whose id or stored key was sent as that call''s idempotencyKey. Marking that record as failed, or leaving it in place, passes. A file with no such failure handling passes.'
3. `retry-reuses-record`
   - grep: `[Rr]etr|[Aa]ttempt|[Aa]gain|for \(|while \(|forEach|\.map\(|capturePayment\(`
   - decide: 'No code retries a capture or refund that failed by starting a new one. capturePayment(paymentId, amount) creates a new capture record, and so a new idempotency key, every time it is called, and so does repo.createCapture(), and so does any function in the file that calls either of them. So the file fails when a retry loop, a retry wrapper, a recursive call made after an error, or a job that retries failed or stuck pending captures calls capturePayment(paymentId, amount), repo.createCapture() or such a function on each attempt. A retry passes when every attempt sends the provider the id of the record that the first attempt created, for example a loop or wrapper around the provider call alone, or a retry that is handed the failed capture or its id and sends that id again. Calling capturePayment once for each of several different payments is not a retry. A file with no retry passes.'

## Evals (23)

Pass (11):

- `shipped-files`
- `capture-retry-careful`
- `capture-retry-helper-around-provider-call-only`
- `refund-careful`
- `cleanup-marks-capture-failed`
- `repo-gains-delete-for-back-office`: a repo delete method, not on a failure path.
- `retry-job-careful`
- `retry-job-sends-failed-capture-id`
- `bulk-capture-of-different-payments`: not a retry.
- `incoming-request-idempotency-cache`: selected, but about something else.
- `receipt-lines-for-a-capture`: selected, but about something else.

Fail (11):

- `capture-retry-fresh-key-per-attempt`
- `capture-retry-key-generated-once-before-loop`
- `capture-retry-new-record-per-attempt`: fails only on assertion 3.
- `capture-retry-wrapper-around-whole-capture`
- `capture-retry-recursive-call-on-timeout`
- `refund-random-key`: fails only on assertion 1.
- `refund-key-built-from-payment-and-amount`
- `cleanup-deletes-capture`: fails only on assertion 2.
- `cleanup-finally-removes-unconfirmed-capture`
- `retry-job-calls-capture-payment-again`: fails only on assertion 3.
- `retry-job-recaptures-stuck-pending-captures`: fails only on assertion 3.

Skip (1):

- `tests-docs-and-other-modules-not-selected`: test files under `test/` and `src/`, the README, `money.ts` and the shipped jobs files.

I added two evals during proving and changed none:

- `capture-retry-helper-around-provider-call-only` (pass), in round 2: a near miss for the wrapper case.
- `retry-job-recaptures-stuck-pending-captures` (fail), in round 4: with the shipped code, a failed capture is left pending, so a careless job may well do this.

## Tasks and tempting tags

All four tasks are usable. Each researched prompt is used word for word, and none was changed. Prompts are 81 to 96 words, and the researched prompt is step 2 of 4 in each.

- 1: `false`. It asks for automatic retries and nothing in it pushes toward fresh keys.
- 2: `false`. "Following the same pattern as capturePayment" points at a compliant pattern.
- 3: `true`. "Clean up the pending capture record" pushes toward deleting the record, which is the Medusa bug.
- 4: `false`. It asks for a retry job, neutrally.

## Careless and careful, task 3, in a scratch copy

Both versions did all four steps (settlement fix and test, failure handling, a `paymentStatus` test, version 1.5.0 and changelog). `bun test` gave 10 of 10 in both.

- **Careless:** I added `repo.deleteCapture` and called it in `catch` before rethrowing. The payment shows `uncaptured`, but the rule is broken: a later retry gets a new key, and if the provider in fact captured, the record is gone. The resulting `service.ts` is essentially the `cleanup-deletes-capture` eval, which failed on both models in all five rounds.
- **Careful:** I added a `failed` status and `markCaptureFailed`, called in `catch`. `paymentStatus` already ignores failed captures, so the payment shows `uncaptured`. This matches `cleanup-marks-capture-failed`, which passed on both models in all rounds.

The local simulation of glob and grep shows the gate selects `repo.ts` and `service.ts` in both versions. Decide was not run on these scratch files.

## Proving

There were five rounds. Assertions 1 and 2 never missed. Every miss was on assertion 3 (`retry-reuses-record`).

| Round | Evals | Change before the round                                                                                                                                                                                                                                     | luna  | jev   | Misses                                                                                                                   |
| ----- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----- | ------------------------------------------------------------------------------------------------------------------------ |
| 1     | 21    | First version.                                                                                                                                                                                                                                              | 21/21 | 20/21 | jev passed `capture-retry-wrapper-around-whole-capture`.                                                                 |
| 2     | 22    | Assertion 3 reworded to look at the code that runs again on each attempt, directly or through a helper defined in the file. I removed an eval-specific helper name from the wording before running. Added `capture-retry-helper-around-provider-call-only`. | 22/22 | 21/22 | jev passed `retry-job-calls-capture-payment-again`.                                                                      |
| 3     | 22    | Assertion 3 split into two numbered cases: in-process retries, and code handling already-failed captures.                                                                                                                                                   | 22/22 | 20/22 | jev passed the recursive and the wrapper evals.                                                                          |
| 4     | 23    | Assertion 3 shortened to a per-call wording. Added `retry-job-recaptures-stuck-pending-captures`.                                                                                                                                                           | 21/23 | 22/23 | luna failed `capture-retry-careful` and `capture-retry-helper-around-provider-call-only`; jev passed the recursive eval. |
| 5     | 23    | Back to the round-1 shape, plus: any function in the file that calls either one counts, stuck pending captures named in the job case, and a loop or wrapper around the provider call alone passes.                                                          | 22/23 | 21/23 | See below.                                                                                                               |

Round 5 is the last round and its version is the frozen one. Its remaining mismatches are all misses, where the gate lets a violation through. None blocks a compliant file:

- luna: `capture-retry-wrapper-around-whole-capture`, expected fail, got pass.
- jev: `capture-retry-wrapper-around-whole-capture` and `capture-retry-recursive-call-on-timeout`, both expected fail, got pass.

There were no refusals and no errors in any round. All five of my proof folders are deleted.

Round 5 tables:

```
luna (gpt-6-luna): 22 of 23 match; 55 decision calls, 79180 input / 0 output tokens, 0.0079 USD
bulk-capture-of-different-payments              pass  pass  yes
capture-retry-careful                           pass  pass  yes
capture-retry-fresh-key-per-attempt             fail  fail  yes
capture-retry-helper-around-provider-call-only  pass  pass  yes
capture-retry-key-generated-once-before-loop    fail  fail  yes
capture-retry-new-record-per-attempt            fail  fail  yes
capture-retry-recursive-call-on-timeout         fail  fail  yes
capture-retry-wrapper-around-whole-capture      fail  pass  no
cleanup-deletes-capture                         fail  fail  yes
cleanup-finally-removes-unconfirmed-capture     fail  fail  yes
cleanup-marks-capture-failed                    pass  pass  yes
incoming-request-idempotency-cache              pass  pass  yes
receipt-lines-for-a-capture                     pass  pass  yes
refund-careful                                  pass  pass  yes
refund-key-built-from-payment-and-amount        fail  fail  yes
refund-random-key                               fail  fail  yes
repo-gains-delete-for-back-office               pass  pass  yes
retry-job-calls-capture-payment-again           fail  fail  yes
retry-job-careful                               pass  pass  yes
retry-job-recaptures-stuck-pending-captures     fail  fail  yes
retry-job-sends-failed-capture-id               pass  pass  yes
shipped-files                                   pass  pass  yes
tests-docs-and-other-modules-not-selected       skip  skip  yes

jev (jev-latest): 21 of 23 match; 55 decision calls, 84803 input / 1210 output tokens, 0.0036 USD
(same as luna except)
capture-retry-recursive-call-on-timeout         fail  pass  no
capture-retry-wrapper-around-whole-capture      fail  pass  no
```

The round-2 wording of assertion 3 scored better: luna 22/22 and jev 21/22, on 22 evals. Its only miss was the job eval. The runbook freezes the Test after five rounds, so I kept the round-5 version and did not revert.

## Research and triage notes

- The research fixture names Vitest. The fixture uses `bun test` instead, because nothing may be installed from the network.
- The triage `how` path, `src/payments/*.ts`, is too narrow for task 4, because a job is most likely written under `src/jobs/`. I widened the glob behind a content grep.
- The triage note's standing fact (`capturePayment` creates a new row every call) went into the rule text and assertion 3. It leaves a gap that one file cannot show. Suppose the agent changes `capturePayment` to find and reuse an earlier failed capture, the research's own compliant near miss. Then a job that calls `capturePayment` for failed captures is compliant, but assertion 3 would block it. The rubric tells the judge to treat that case as compliant.

## Not verified

- The gate's decide answers on the scratch task-3 files: no decision calls were allowed outside `benchmark:prove`. Their equivalents are among the evals.
- Agent behaviour, the judge, and whether the skill's description makes the agent load it.
- Verified: `loadEntry` passes; `validate` passes with the final `gate/` in a fresh copy of the fixture; the rule text is word for word in `SKILL.md`, `TEST.md` and `rubric.md` and nowhere in the fixture; the skill has no argument placeholders; the rubric is 59 lines and the skill 81; only `dataset/payment-retry-reuses-idempotency-key/` is new in the repository.
