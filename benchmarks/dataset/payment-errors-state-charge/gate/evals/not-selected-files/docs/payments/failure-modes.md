# Card payments: failure modes

Engineering notes on the ways a card payment can fail, at checkout and when a subscription renews.
Card payments go through our payment gateway. When a payment fails, the gateway returns one of the
codes below, and the web app shows the string `checkout.errors.<code>` from `locales/en.json`. Until
a string exists for a code, the app shows the raw code.

## Card declined: `card_declined`

The customer's bank refused the payment, and the gateway does not tell us why. No money is taken,
and the order is not placed. The customer can pay with another card, or ask their bank why the
card was refused and then try again.

## Insufficient funds: `insufficient_funds`

The bank refused the payment because the account does not have enough money in it. No money is
taken, and the order is not placed. The customer can pay with another card, or try again once
there is money in the account.

## 3-D Secure not completed: `authentication_abandoned`

The bank asked the customer to confirm the payment (3-D Secure, in their banking app or by a code
sent by text), and the check was closed or ran out of time before it was finished. No money is
taken, and the order is not placed. The customer can pay again and complete the check when their
bank asks.

## Gateway timeout: `gateway_timeout`

The gateway gave no answer within 30 seconds (`checkout.gatewayTimeoutSeconds` in
`app.config.json`), so we do not know whether the bank approved the charge. The order is not placed.
If a charge did go through, the gateway voids it within 24 hours and it drops off the customer's
statement. The customer can try again straight away.

## Renewals

A subscription renews on its renewal date: we charge the saved card the plan price and the box
ships the next working day. A renewal can fail with `card_declined` or `insufficient_funds`. When
it does, no money is taken and the box does not ship. We try the card again 3 days later; after a
second failed retry the subscription is paused. The customer can update their card under Account >
Payment method, and we try again at once.

While a renewal is unpaid, the app can show a banner at the top of every page. Placeholders for the
banner: `{{amount}}`, `{{card_last4}}`, `{{retry_date}}`.

Placeholders for the renewal failure email: `{{first_name}}`, `{{amount}}`, `{{card_last4}}`,
`{{retry_date}}`, `{{update_card_url}}`.

## Draft strings

- card_declined: Payment failed. Please try again.
- gateway_timeout: Payment failed. Please try again.
