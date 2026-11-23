# Rubric: payment failure messages say whether money was taken

## The rule

A payment failure message tells the customer whether any money was taken and what to do next, such as retrying, using another card or contacting their bank.
This covers every message in which Roastpost tells a customer that a card payment did not go through, at checkout or when a subscription renews: interface strings and banners, emails and support macros. Saying only that a payment failed, was declined, did not go through or could not be processed does not tell the customer whether money was taken; the message says it in words, such as "you have not been charged" or "no money has been taken". Roastpost's payment failures are these, and a message that covers several of them, such as a support macro, says it for each:
- A declined card, insufficient funds and a 3-D Secure check that was not completed take no money, so their messages say that the customer has not been charged.
- A gateway timeout leaves the charge status unknown, and any charge from that attempt is voided within 24 hours, so its message does not say that the customer has not been charged; it says what happens to any charge.

## What to look at

1. Grade only the messages the diff adds or changes in which Roastpost tells a customer that a card
   payment did not go through: checkout error strings, banners, a renewal failure email (subject
   and preheader included) and a support macro. Changelogs, READMEs, config, scripts, tests, labels,
   field validation strings such as "Enter the whole card number" and messages about successful or
   upcoming payments are not graded.
2. For each message, find the charge status in words. "You haven't been charged", "no money has
   been taken", "no payment was made" and "nothing has left your account" state it. "Your payment
   failed", "was declined", "didn't go through", "couldn't be processed", "your order wasn't placed"
   or "your box hasn't shipped" do not, even with "please try again" after them.
3. Check the status against the failure. A declined card, insufficient funds and an unfinished
   3-D Secure check take no money: their messages say the customer has not been charged, and a hedge
   such as "if you were charged, it will be refunded" is not enough for them. A gateway timeout is
   the hard case: the message must not say the customer was not charged, and should say that any
   charge from the attempt is voided (cancelled, reversed) within 24 hours. "You may have been
   charged" with nothing about what happens to the charge does not meet it.
4. For each message, find a next step: try again, use another card, contact the bank, complete
   the 3-D Secure check, update the card, or contact Roastpost. A message that only reports the
   failure has none. A macro covering several failures gives the status and a step for each.
5. Check the task: each step of the prompt was done. A skipped chore alone never goes below 7.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the rule is clearly broken. A 1: the messages give neither charge status nor a next
  step. A 2: generic failure text with a retry prompt ("Payment failed. Please try again.") and no
  charge status anywhere. A 3: next steps everywhere but charge status in at most one message, or
  a timeout message that tells the customer they were not charged.
- **4 to 6**: partly followed. A 4: about half the messages state the charge status. A 5: every
  message but one or two states it correctly; or every decline is right but the timeout says "you
  may have been charged" without what happens to the charge. A 6: all statuses given, but one
  message has no next step or hedges a decline as "if you were charged".
- **7 to 9**: the rule is followed. A 7 or 8: every message states the charge status correctly
  and a next step, with one weak phrase (a timeout message without the 24 hours) or a step of the
  task skipped. A 9: no lapse in the messages and only a small part of the task missing.
- **10**: every step of the task is done, and every payment failure message states correctly
  whether money was taken, or for a timeout what happens to any charge, and what to do next.

## Anchors

- **2**: "Payment failed. Please try again." for every failure code.
- **5**: three checkout errors like "Your bank declined this payment, so you haven't been charged.
  Try another card or contact your bank.", and the timeout as "Something went wrong. Please try
  again."
- **8**: every message correct but the timeout's "If any money was taken, it will be returned"
  says not when; or everything right and the changelog line missing.
- **10**: the whole task done; the timeout says "We couldn't confirm your payment. If your card was
  charged, the charge is cancelled within 24 hours. You can try again now." and every decline says
  the customer hasn't been charged and what to do.
