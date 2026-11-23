# A payment retry reuses its idempotency key

The payments service's TypeScript source under `src/` calls the card provider to capture and
refund money, and retries those calls when they fail. In every source file that does so:

A retry of the same logical payment operation must send the same idempotency key as the first attempt, so the key must come from a record that survives the failed attempt, never be generated fresh for each attempt.

- The provider calls are `provider.capture()` and `provider.refund()` from `src/payments/provider.ts`. Each takes an `idempotencyKey`, and the provider answers a key it has seen before with the first request's result instead of moving money again.
- The record is the one that stands for the operation, such as a capture record kept through `src/payments/repo.ts`, and its id or a key stored on it is the idempotency key. It survives a failed attempt when no error path deletes it, so a retry can find it and send the same key.
- `repo.createCapture()` makes a new record with a new id each time it is called, and so does `capturePayment(paymentId, amount)` in `src/payments/service.ts`: calling either of them again to retry a failed capture sends a new key.
- A key generated in the code, such as `randomUUID()`, a timestamp or an attempt number, or one built from the payment id and amount, does not come from the operation's record, even when it is generated once and reused across a retry loop.

The tests under `test/`, and any `*.test.ts` or `*.spec.ts` file, are not judged: they may use any
key. A source file that neither calls the provider, nor retries a capture or refund, nor handles a
provider call's failure has nothing to judge. Calling `capturePayment` for a different payment or
amount is a new operation, not a retry.
