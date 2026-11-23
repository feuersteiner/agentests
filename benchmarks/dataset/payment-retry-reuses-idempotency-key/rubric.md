# Rubric: a payment retry reuses its idempotency key

## The rule

A retry of the same logical payment operation must send the same idempotency key as the first attempt, so the key must come from a record that survives the failed attempt, never be generated fresh for each attempt.

- The provider calls are `provider.capture()` and `provider.refund()` from `src/payments/provider.ts`. Each takes an `idempotencyKey`, and the provider answers a key it has seen before with the first request's result instead of moving money again.
- The record is the one that stands for the operation, such as a capture record kept through `src/payments/repo.ts`, and its id or a key stored on it is the idempotency key. It survives a failed attempt when no error path deletes it, so a retry can find it and send the same key.
- `repo.createCapture()` makes a new record with a new id each time it is called, and so does `capturePayment(paymentId, amount)` in `src/payments/service.ts`: calling either of them again to retry a failed capture sends a new key.
- A key generated in the code, such as `randomUUID()`, a timestamp or an attempt number, or one built from the payment id and amount, does not come from the operation's record, even when it is generated once and reused across a retry loop.

## What to look at

Read the non-test code the diff adds or changes under `src/`, and for each provider call ask:

1. **Where does the key come from?** Trace each `idempotencyKey` back. It complies when it is the
   id, or a key stored on, a capture, refund or other record created or loaded through the
   repository before the call. A refund had no record of its own when the agent started, so a
   compliant refund creates one; `randomUUID()`, `Date.now()`, an attempt counter or a string of
   the payment id and amount is not a record.
2. **Does every retry send the same key?** Look at each retry path: a loop or recursive call in
   the service, a wrapper around `capturePayment`, a background job over failed captures. A loop
   around the provider call alone, reusing one record, complies. A loop that calls
   `repo.createCapture()` or `capturePayment()` on each attempt, or a job that calls
   `capturePayment(paymentId, amount)` for a failed capture, sends a new key, unless the diff
   itself changes `capturePayment` so that it finds and reuses the earlier record.
3. **Does the record survive the failure?** A `catch`, `finally` or `.catch()` that deletes the
   record whose id was the key breaks the rule, even as "clean-up". Marking it failed complies.

Do not grade backoff or which errors are retried, only the key; tests may use any key. The other
steps of the task count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a fresh key per attempt or per call, a retry that starts a new record, or a failure
  path that deletes the record.
- **4 to 6**: retries are safe in one place and not in another, or the key is stable across an
  in-process loop but does not come from the operation's record.
- **7 to 9**: every key comes from the operation's record, which survives failure, and every
  retry reuses it; a minor lapse, or a step of the task missing.
- **10**: the whole task is done and every provider call and retry follows the rule.

What each looks like:

- **2**: `provider.capture({ ..., idempotencyKey: randomUUID() })` inside a retry loop; a loop
  that calls `repo.createCapture()` on each attempt; a job that calls `capturePayment()` again for
  each failed capture; a `catch` that deletes the pending capture; a refund keyed by
  `randomUUID()` or a timestamp.
- **5**: the in-process loop keeps `capture.id`, but the record is deleted once the attempts run
  out; or a key generated once into a local variable and reused across the loop; or refund keys
  built from the payment id and amount, so two equal refunds would share one.
- **8**: every key is the id of the operation's record and no failure path deletes it, but a
  step such as the README, the changelog or a test is missing, or a reused failed capture is
  matched on the payment alone, so a capture of another amount could reuse its key.
- **10**: for example one capture record created before the retry loop, its id sent on every
  attempt; a refund record created through the repository, its id the key; a failed capture
  marked failed, not deleted, and ignored by `paymentStatus`; a job that retries each failed
  capture with its own id. Every other step of the prompt is done.
