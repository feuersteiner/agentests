---
name: payment-errors-state-charge
description: Covers what a message about a failed card payment must tell the customer. Use whenever writing or editing checkout or payment error strings in a locale file, a banner about a declined or unpaid payment, an email about a failed charge or renewal, or a support macro about payment or checkout errors, even if the request says nothing about the wording.
---

# Payment failure messages say whether money was taken

A payment failure message tells the customer whether any money was taken and what to do next, such as retrying, using another card or contacting their bank.
This covers every message in which Roastpost tells a customer that a card payment did not go through, at checkout or when a subscription renews: interface strings and banners, emails and support macros. Saying only that a payment failed, was declined, did not go through or could not be processed does not tell the customer whether money was taken; the message says it in words, such as "you have not been charged" or "no money has been taken". Roastpost's payment failures are these, and a message that covers several of them, such as a support macro, says it for each:
- A declined card, insufficient funds and a 3-D Secure check that was not completed take no money, so their messages say that the customer has not been charged.
- A gateway timeout leaves the charge status unknown, and any charge from that attempt is voided within 24 hours, so its message does not say that the customer has not been charged; it says what happens to any charge.

Apply this to every payment failure message you write or change, for the whole task, and check it
again before you commit.

## Why

- The first thing a customer wonders after a failed payment is whether they have paid. A message
  that leaves it open sends them to their banking app, to support, or into paying twice.
- "Payment failed. Please try again." is the usual default. It feels complete, but it says
  nothing about the money, and after a timeout it invites a second charge.
- A timeout is the honest exception: nobody knows yet whether the bank took the money, so the
  message says what happens to any charge instead of promising there was none.

## How to write one

1. Name what happened in plain words: the bank declined the card, the account had too little
   money, the bank's check was not finished, or the payment could not be confirmed.
2. Say whether money was taken, in words: "you haven't been charged", "no money has been taken".
   For a timeout, say that any charge from the attempt is voided within 24 hours.
3. Say what to do next: try again, use another card, contact the bank, finish the bank's check,
   update the card, or contact us.
4. In a message that covers several failures, such as a support macro, do this for each one.

## Gotchas

- "was declined", "didn't go through", "couldn't be processed", "your order wasn't placed" and
  "your box hasn't shipped" do not say whether money was taken.
- "If you were charged, we'll refund you" is wrong for a decline: a decline takes no money, so say so.
- "You haven't been charged" is wrong for a timeout: the charge status is unknown.
- A title or heading may be short, but the message it belongs to still needs both parts.

## Example

Paying for a gift subscription, the codes `card_declined` and `gateway_timeout`.

Compliant:

```json
{
  "card_declined": "Your bank declined this card, so you haven't been charged. Try another card, or ask your bank why it was declined.",
  "gateway_timeout": "We couldn't confirm this payment with your bank. If your card was charged, the charge is cancelled within 24 hours. You can try again now."
}
```

Violating:

```json
{
  "card_declined": "Your card was declined. Please try again.",
  "gateway_timeout": "Something went wrong and you haven't been charged. Please try again."
}
```

## Before you commit

Reread every payment failure message you created or changed, banners, email subjects and macros
included. For each one, ask: does it say whether the customer paid, correctly for its failure, and
does it say what to do next? If not, rewrite it.
