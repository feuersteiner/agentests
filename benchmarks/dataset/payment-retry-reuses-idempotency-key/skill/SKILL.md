---
name: payment-retry-reuses-idempotency-key
description: Use whenever you write or change TypeScript code under src/ that calls the payment provider (provider.capture, provider.refund) or that retries, re-runs or cleans up after a failed capture or refund - retry loops and wrappers, background jobs that retry failed payments, new provider operations such as refunds, error handling around a provider call - even if the request does not mention idempotency. Covers where a provider call's idempotency key comes from and what a failure path may do with the record that holds it.
---

# A payment retry reuses its idempotency key

## The rule

A retry of the same logical payment operation must send the same idempotency key as the first attempt, so the key must come from a record that survives the failed attempt, never be generated fresh for each attempt.

- The provider calls are `provider.capture()` and `provider.refund()` from `src/payments/provider.ts`. Each takes an `idempotencyKey`, and the provider answers a key it has seen before with the first request's result instead of moving money again.
- The record is the one that stands for the operation, such as a capture record kept through `src/payments/repo.ts`, and its id or a key stored on it is the idempotency key. It survives a failed attempt when no error path deletes it, so a retry can find it and send the same key.
- `repo.createCapture()` makes a new record with a new id each time it is called, and so does `capturePayment(paymentId, amount)` in `src/payments/service.ts`: calling either of them again to retry a failed capture sends a new key.
- A key generated in the code, such as `randomUUID()`, a timestamp or an attempt number, or one built from the payment id and amount, does not come from the operation's record, even when it is generated once and reused across a retry loop.

## Why

A timeout does not mean the provider did nothing: it may have moved the money and failed to
answer. A retry with the same key gets that first result back; a retry with a new key is a new
request, and the customer is charged or refunded twice. Medusa shipped exactly this bug: each
capture attempt got a new row, the row's id was the key, and the failure path deleted the row, so
every retry after a provider timeout sent a different key. A key built from the payment id and
amount avoids that but makes two separate refunds of the same amount look like one.

## How to apply it

1. Before the first provider call of an operation, create (or load) the record that stands for
   it through the repository, and send its id as `idempotencyKey`.
2. Retry only the provider call, with that same record. Do not put record creation, or a call to
   `capturePayment`, inside the loop.
3. A later retry (a job, a back-office button) loads the failed record and sends its id again;
   pass the record or its id to the code that retries, not just the payment id and amount.
4. On failure, keep the record: mark it failed if something must show that it failed. Never
   delete it, however much the request calls that "clean-up".
5. A new provider operation, such as a refund, gets a record of its own in the repository.

Slips to watch for: `idempotencyKey: randomUUID()` next to the call; `` `${paymentId}-${attempt}` ``;
a `withRetry(() => capturePayment(id, amount))` wrapper; a job that calls `capturePayment` for each
failed capture; `repo.deleteCapture(capture.id)` in a `catch` or `finally`.

## Example

A shipment event, which the queue may deliver more than once, triggers a capture.

Violating: every delivery sends a new key, so a redelivery captures again.

```ts
async function onShipped(event: ShippedEvent) {
	await provider.capture({
		providerPaymentId: event.providerPaymentId,
		amount: event.amount,
		currency: event.currency,
		idempotencyKey: randomUUID()
	});
}
```

Compliant: the record for this shipment's capture is found or created first, and its id is the key.

```ts
async function onShipped(event: ShippedEvent) {
	const capture =
		shipmentCaptures.find(event.shipmentId) ??
		shipmentCaptures.create(event.shipmentId, event.amount);
	const result = await provider.capture({
		providerPaymentId: event.providerPaymentId,
		amount: event.amount,
		currency: event.currency,
		idempotencyKey: capture.id
	});
	shipmentCaptures.markSucceeded(capture.id, result.id);
}
```

## Before you commit

For every `provider.capture` and `provider.refund` call in the diff, trace its `idempotencyKey` to
the record it comes from. For every retry path (loop, wrapper, job), check that each attempt sends
that same record's key. For every `catch`, `finally` and `.catch()`, check that nothing deletes the
record. Fix what fails and check again.
