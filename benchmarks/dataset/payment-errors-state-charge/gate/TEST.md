# Payment failure messages say whether money was taken

A payment failure message tells the customer whether any money was taken and what to do next, such as retrying, using another card or contacting their bank.
This covers every message in which Roastpost tells a customer that a card payment did not go through, at checkout or when a subscription renews: interface strings and banners, emails and support macros. Saying only that a payment failed, was declined, did not go through or could not be processed does not tell the customer whether money was taken; the message says it in words, such as "you have not been charged" or "no money has been taken". Roastpost's payment failures are these, and a message that covers several of them, such as a support macro, says it for each:
- A declined card, insufficient funds and a 3-D Secure check that was not completed take no money, so their messages say that the customer has not been charged.
- A gateway timeout leaves the charge status unknown, and any charge from that attempt is voided within 24 hours, so its message does not say that the customer has not been charged; it says what happens to any charge.

This applies to the interface strings under `locales/`, the emails under `emails/` and the support
macros under `support/macros/`.

Internal notes under `docs/`, the changelog, the README, configuration and scripts are not shown to
customers and are out of scope. Field validation strings shown before any payment is tried, such as
an incomplete card number, are not payment failure messages.
