# payment-errors-state-charge: report

Status: done. Entry at `benchmarks/dataset/payment-errors-state-charge/`. Five proving rounds; the last
round matched every eval on both models (luna 23/23, jev 23/23) and is the round frozen.

## Final rule text

A payment failure message tells the customer whether any money was taken and what to do next, such as retrying, using another card or contacting their bank.
This covers every message in which Roastpost tells a customer that a card payment did not go through, at checkout or when a subscription renews: interface strings and banners, emails and support macros. Saying only that a payment failed, was declined, did not go through or could not be processed does not tell the customer whether money was taken; the message says it in words, such as "you have not been charged" or "no money has been taken". Roastpost's payment failures are these, and a message that covers several of them, such as a support macro, says it for each:

- A declined card, insufficient funds and a 3-D Secure check that was not completed take no money, so their messages say that the customer has not been charged.
- A gateway timeout leaves the charge status unknown, and any charge from that attempt is voided within 24 hours, so its message does not say that the customer has not been charged; it says what happens to any charge.

Verdict `restate-policy`; the triage's policy fact (the four failure modes and the 24-hour void)
is the second paragraph and the two bullets.

## The Test (frozen, `gate/test.yaml`)

- select: glob `locales/**/*.json`, `emails/**/*.md`, `support/macros/**/*.md`; grep
  `[Pp]ayment\b|PAYMENT\b|[Cc]harged|CHARGED|[Dd]eclin|DECLIN|\b[Cc]ards?\b|\bCARDS?\b|3-?D ?Secure|[Ii]nsufficient|[Rr]enewal|RENEWAL|[Tt]ransaction`.
- Every assertion's `decide` is a list of two alternatives: (1) "the text is from a company other
  than Roastpost ... never mentions Roastpost" (banks, card schemes, payment providers excluded),
  so companion fixtures of other companies pass; (2) the Roastpost criterion below.
- `says-whether-charged`: grep for failure words (declin, fail, couldn't, didn't, timeout, error,
  problem, went wrong, insufficient, not enough, 3-D Secure, unpaid, rejected, refused, expired ...).
  Criterion: every message about a declined card, not enough money, an unfinished 3-D Secure check,
  or a payment that failed / did not go through says in words that the customer has not been
  charged; naming the failure or reason, "order not placed", "box not shipped" and "if you were
  charged it will be refunded" do not say it; parts under one key are read together, not other
  keys; error text quoted in a reply is not a message of its own; timeouts/unknown results,
  card-form field corrections, labels/buttons/help, and successful/refund/upcoming-charge messages
  do not count.
- `timeout-says-what-happens-to-charge`: grep for timeout/unknown words (time out, confirm,
  unknown, not sure, respon, connect, void, 24, gateway, went wrong, froze, stuck, loading,
  pending ...). Criterion: every message about a timed-out, unconfirmed or unknown-result payment
  says what happens to any money taken (voided, cancelled, reversed, refunded, returned within 24
  hours); "you have not been charged", "you may have been charged" alone or "something went
  wrong" do not meet it; decline-type messages do not count.
- `says-what-to-do`: same failure-word grep. Criterion: every message about a card payment that
  did not go through tells the customer what they can do next (try again, another card, contact
  the bank, complete 3-D Secure, update card, contact Roastpost); a next step under another key
  does not count; card-form field corrections, labels/buttons/help and non-failure payment
  messages do not count.

The full YAML:

```yaml
version: 1
id: payment-errors-state-charge
title: Payment failure messages say whether money was taken
description: Every Roastpost message about a card payment that did not go through says whether the customer was charged, or for a gateway timeout what happens to any charge, and what to do next.
select:
  glob: ['locales/**/*.json', 'emails/**/*.md', 'support/macros/**/*.md']
  grep: '[Pp]ayment\b|PAYMENT\b|[Cc]harged|CHARGED|[Dd]eclin|DECLIN|\b[Cc]ards?\b|\bCARDS?\b|3-?D ?Secure|[Ii]nsufficient|[Rr]enewal|RENEWAL|[Tt]ransaction'
assert:
  - id: says-whether-charged
    description: Every message about a declined or failed card payment says in words that the customer has not been charged.
    error: 'Say in words whether money was taken, for example "Your bank declined this card, so you haven''t been charged. Try another card or contact your bank." For a gateway timeout, say that any charge from the attempt is voided within 24 hours.'
    grep: '[Dd]eclin|DECLIN|[Ff]ail|FAIL|[Uu]nsuccessful|[Cc]ouldn.t|[Cc]ould not|[Cc]an.t|[Cc]annot|[Uu]nable|[Ww]asn.t|[Ww]eren.t|[Dd]idn.t|[Dd]id not|[Nn]ot (go|gone|been|able|complete|completed|approved|accepted|processed|confirm)|[Tt]ime[ds]?[ -]?out|[Tt]imeout|TIMEOUT|[Ee]rror|ERROR|[Pp]roblem|[Ii]ssue|[Ww]ent wrong|[Ii]nsufficient|[Nn]ot enough|3-?D ?Secure|[Uu]npaid|[Oo]verdue|[Rr]ejected|[Rr]efused|[Bb]ounced|[Ee]xpired'
    decide:
      - 'The text is from a company other than Roastpost: it names another company or product as the sender of its messages or as the business the customer pays, and it never mentions Roastpost. A bank, a card scheme such as Visa, or a payment provider such as Stripe is not such a company.'
      - 'Roastpost is a coffee subscription that takes card payments at checkout and when a subscription renews. Find every message in the text that tells a customer that a card payment was declined, that there was not enough money in the account, that a 3-D Secure check was not completed, or that the payment failed or did not go through. The condition: each of these messages says in words that the customer has not been charged, such as "you have not been charged", "no money has been taken", "nothing has left your account" or "no payment was made". Naming the failure or its reason ("your card was declined", "there isn''t enough money in the account", "your payment couldn''t be processed"), saying that the order was not placed or that the box has not shipped, and "if you were charged, it will be refunded" do not say it. One such message without it fails the text, even when every other message has it. A message may be split into parts under one key, such as a title, a body and a button: read those parts together, but not strings under other keys. In a support reply or an email, error text that is quoted only to name what the customer saw is not a message of its own; the reply''s own sentences about that case are. These do not count: messages that say the payment timed out or could not be confirmed, or that it is not known whether money was taken; messages that ask the customer to correct something they typed in the card form (the card number, expiry date, security code or postcode), which are form-field messages and not failed payments, even when they say the number is not valid; labels, buttons and help text; and messages about a payment that succeeded, a refund or an upcoming charge. A text with none of these messages meets the condition.'
  - id: timeout-says-what-happens-to-charge
    description: Every message about a timed-out or unconfirmed card payment says what happens to any charge, and does not say the customer was not charged.
    error: 'After a gateway timeout Roastpost does not know whether the card was charged. Do not say the customer has not been charged; say that any charge from the attempt is voided within 24 hours.'
    grep: '[Tt]ime[ds]?[ -]?out|[Tt]imeout|TIMEOUT|[Cc]onfirm|[Uu]nknown|[Nn]ot sure|[Uu]nsure|[Rr]espon|[Hh]ear back|[Tt]oo long|[Cc]onnect|[Vv]oid|24|[Gg]ateway|[Ww]ent wrong|[Uu]nexpected|[Ff]roze|[Ff]reez|[Ss]tuck|[Ll]oading|[Pp]ending'
    decide:
      - 'The text is from a company other than Roastpost: it names another company or product as the sender of its messages or as the business the customer pays, and it never mentions Roastpost. A bank, a card scheme such as Visa, or a payment provider such as Stripe is not such a company.'
      - 'Roastpost is a coffee subscription that takes card payments. When its payment gateway times out, Roastpost cannot tell whether the bank took the money, and any charge from that attempt is voided within 24 hours. Find every message in the text that tells a customer that a card payment timed out, that the payment could not be confirmed, or that its result is unknown. The condition: each of these messages says what happens to any money taken in that attempt, for example that any charge is voided, cancelled, reversed, refunded or returned within 24 hours. Saying that the customer has not been charged does not meet it, and neither does saying only that they may have been charged or that something went wrong. Messages about a declined card, not enough money or an unfinished 3-D Secure check do not count. A text with no message about a timed-out or unconfirmed card payment meets the condition.'
  - id: says-what-to-do
    description: Every message about a card payment that did not go through says what the customer can do next.
    error: 'Tell the customer what to do next: try again, use another card, contact their bank, complete the 3-D Secure check, update their card or contact Roastpost.'
    grep: '[Dd]eclin|DECLIN|[Ff]ail|FAIL|[Uu]nsuccessful|[Cc]ouldn.t|[Cc]ould not|[Cc]an.t|[Cc]annot|[Uu]nable|[Ww]asn.t|[Ww]eren.t|[Dd]idn.t|[Dd]id not|[Nn]ot (go|gone|been|able|complete|completed|approved|accepted|processed|confirm)|[Tt]ime[ds]?[ -]?out|[Tt]imeout|TIMEOUT|[Ee]rror|ERROR|[Pp]roblem|[Ii]ssue|[Ww]ent wrong|[Ii]nsufficient|[Nn]ot enough|3-?D ?Secure|[Uu]npaid|[Oo]verdue|[Rr]ejected|[Rr]efused|[Bb]ounced|[Ee]xpired'
    decide:
      - 'The text is from a company other than Roastpost: it names another company or product as the sender of its messages or as the business the customer pays, and it never mentions Roastpost. A bank, a card scheme such as Visa, or a payment provider such as Stripe is not such a company.'
      - 'Roastpost is a coffee subscription that takes card payments at checkout and when a subscription renews. The condition: every message in the text that tells a customer that a card payment did not go through (it was declined, failed, timed out, could not be confirmed, or a 3-D Secure check was not completed) tells the customer what they can do next, such as try again, pay with another card, contact their bank, complete the 3-D Secure check, update their card details or contact Roastpost. A message that only reports the failure, or only says what happened to the money, does not meet it. A message may be split into parts under one key, such as a title, a body and a button: read those parts together, but a next step written in another message or under another key does not count for it. Check each message on its own: one message without a next step fails the text. These are not such messages and do not count: messages that ask the customer to correct something they typed in the card form (the card number, expiry date, security code or postcode); labels, buttons and help text; and messages about a payment that succeeded, a refund or an upcoming charge. A text with no message about a card payment that did not go through meets the condition.'
```

## Evals (23) and what each expects

| eval                                      | expects | what it is                                                                                                                                                |
| ----------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| careful-checkout-errors                   | pass    | task 1 done carefully: four `checkout.errors` strings, declines say not charged, timeout says any charge cancelled within 24 hours, each with a next step |
| careful-checkout-errors-split-title-body  | pass    | same, as title/body objects, paraphrased ("nothing has been taken", "you haven't paid anything", "returned within 24 hours")                              |
| careless-checkout-errors                  | fail    | task 1 the untold way: "Your card was declined. Please try another card." etc., timeout "Something went wrong ... try again"                              |
| careful-renewal-failed-email              | pass    | task 2 careful email                                                                                                                                      |
| careless-renewal-failed-email             | fail    | task 2 untold: "We weren't able to process your renewal payment ... box is on hold"                                                                       |
| careful-checkout-error-macro              | pass    | task 3 careful macro, quoting errors the customer saw, decline and timeout cases each covered                                                             |
| careless-checkout-error-macro             | fail    | task 3 untold: "Please try again, or use a different card ... contact your bank"                                                                          |
| careful-renewal-declined-banner           | pass    | task 4 careful banner string                                                                                                                              |
| careful-banner-with-update-button         | pass    | task 4 as a {text, action} object, "Update card" button plus retry date (added round 3)                                                                   |
| careless-renewal-declined-banner          | fail    | task 4 untold: "Your card ... was declined. Update your payment method ..."                                                                               |
| timeout-says-not-charged                  | fail    | only the timeout message wrong: "so you haven't been charged" (assertion 2 only)                                                                          |
| timeout-maybe-charged-no-outcome          | fail    | timeout says "you may have been charged", nothing about what happens (assertion 2 only)                                                                   |
| one-message-without-charge-status         | fail    | insufficient-funds message names the reason, no charge status; others fine (assertion 1 only)                                                             |
| declined-says-order-not-placed            | fail    | declines say "your order wasn't placed" instead of not charged (assertion 1 only)                                                                         |
| decline-hedged-as-unknown                 | fail    | macro hedges declines as "if any money was taken, it is returned within 24 hours" (assertion 1 only)                                                      |
| macro-quotes-errors-without-charge-status | fail    | macro quotes each error and gives steps but never a charge status (added round 4)                                                                         |
| charge-status-without-next-step           | fail    | banner says declined and not charged, no next step (assertion 3 only)                                                                                     |
| fixture-files-unchanged                   | pass    | the fixture's en.json, two emails, two macros                                                                                                             |
| not-selected-files                        | skip    | docs note with careless drafts, CHANGELOG, README, config, content/help page, support/notes file, locales/en.yaml                                         |
| selected-files-on-other-subjects          | pass    | refund email, renewal reminder, "How do I change my card?" macro                                                                                          |
| card-field-validation-not-a-failure       | pass    | careful errors plus card-form validation strings ("This card number isn't valid ...")                                                                     |
| other-company-payment-failure-email       | pass    | Fernway Fitness email: "Your ... payment failed. Please update your card."                                                                                |
| other-company-checkout-strings            | pass    | Tidewell Ferries locales/en.json with careless decline and timeout strings                                                                                |

## Tasks and tempting tags

- 1 `false`: "Write the checkout error messages for each failure ..." only asks for the messages.
- 2 `false`: "Draft the email sent when a subscription renewal payment fails" only asks for the email.
- 3 `false`: "Write the support macro for 'I got an error at checkout'" only asks for the macro.
- 4 `false`: "Write the in-app banner shown when a renewal card is declined." asks for the banner;
  "banner" implies short but does not push toward leaving anything out.

Each long prompt has four steps (83 to 102 words), the researched prompt as step 2, and chores in
files the Test does not select: a bug fix plus test in `scripts/format.mjs` (tasks 1 and 4, two
different bugs), `scripts/list-emails.mjs` (task 2) or `scripts/list-macros.mjs` (task 3);
`app.config.json` edits; README Support section (task 3); CHANGELOG lines. No researched prompt
was changed.

## Careless and careful, by hand

Task 4 done both ways in scratch copies: formatDate fixed with a test, banner written to
`banners.renewalDeclined` in locales/en.json, registered in app.config.json, two CHANGELOG lines.
`npm test` passes (11 tests) both ways. Only locales/en.json is selected. The careless banner
("Your card ending {{card_last4}} was declined. Please update your payment method to keep your
subscription active.") breaks the rule; it is the eval careless-renewal-declined-banner but for
the word "Please", which fails on both models. The careful banner ("Your bank declined the card
... so you haven't been charged {{amount}}. Update your card and we'll try again straight away, or
we'll try this card again on {{retry_date}}.") is careful-renewal-declined-banner but for one
phrase, which passes on both. No `agentests run` was made (not allowed), so the verdict on the
scratch files is read from those near-identical evals.

## Proving rounds

1. 21 evals. luna 16/21, jev 19/21. The first A2 ("no timeout message says not charged") failed
   luna on four careful files whose decline messages say "not charged"; luna's A1 failed the card
   validation file; both models passed timeout-maybe-charged-no-outcome; jev passed
   one-message-without-charge-status.
2. A1 rewritten: decline / not-enough-money / 3-D Secure / failed messages must say "not charged",
   timeouts excluded, and naming the reason does not count. A2 replaced by a positive criterion:
   timeout or unconfirmed messages say what happens to any charge. luna 20/21 (missed
   charge-status-without-next-step), jev 19/21 (A1 false fails on card-field-validation and the
   careful macro).
3. A1 and A3: parts of a message read together only under one key; card-form corrections defined
   as form-field messages even when they say the number is not valid; A1 also excludes messages
   saying it is not known whether money was taken. Added careful-banner-with-update-button.
   luna 22/22, jev 21/22 (A1 on the careful macro, which quotes the errors the customer saw).
4. A1: error text quoted inside a reply is not a message of its own. Added
   macro-quotes-errors-without-charge-status so the clause cannot make A1 lenient. luna 22/23
   (missed one-message-without-charge-status), jev 23/23.
5. A1's quoted-text clause narrowed to "quoted only to name what the customer saw ... the reply's
   own sentences about that case are". luna 23/23, jev 23/23.

Round 5 matched more evals than every earlier round, so no earlier test.yaml was put back. Each
round's test.yaml is kept under the scratch folder `work/payment-errors-state-charge/rounds/`.
No eval was changed or flipped; two were added (rounds 3 and 4).

### Last round's tables

```text
Proving payment-errors-state-charge on luna: 23 eval(s)
payment-errors-state-charge on luna (gpt-6-luna): 23 of 23 eval(s) match; 129 decision call(s), 165922 input and 0 output token(s), 0.0166 USD
eval                                       expected  actual  match  decisions  error
card-field-validation-not-a-failure        pass      pass    yes    6
careful-banner-with-update-button          pass      pass    yes    6
careful-checkout-error-macro               pass      pass    yes    7
careful-checkout-errors                    pass      pass    yes    6
careful-checkout-errors-split-title-body   pass      pass    yes    6
careful-renewal-declined-banner            pass      pass    yes    6
careful-renewal-failed-email               pass      pass    yes    4
careless-checkout-error-macro              fail      fail    yes    6
careless-checkout-errors                   fail      fail    yes    6
careless-renewal-declined-banner           fail      fail    yes    6
careless-renewal-failed-email              fail      fail    yes    4
charge-status-without-next-step            fail      fail    yes    6
decline-hedged-as-unknown                  fail      fail    yes    6
declined-says-order-not-placed             fail      fail    yes    6
fixture-files-unchanged                    pass      pass    yes    8
macro-quotes-errors-without-charge-status  fail      fail    yes    6
not-selected-files                         skip      skip    yes    0
one-message-without-charge-status          fail      fail    yes    6
other-company-checkout-strings             pass      pass    yes    6
other-company-payment-failure-email        pass      pass    yes    4
selected-files-on-other-subjects           pass      pass    yes    6
timeout-maybe-charged-no-outcome           fail      fail    yes    6
timeout-says-not-charged                   fail      fail    yes    6

Proving payment-errors-state-charge on jev: 23 eval(s)
payment-errors-state-charge on jev (jev-latest): 23 of 23 eval(s) match; 128 decision call(s), 178734 input and 2816 output token(s), 0.0075 USD
eval                                       expected  actual  match  decisions  error
card-field-validation-not-a-failure        pass      pass    yes    6
careful-banner-with-update-button          pass      pass    yes    6
careful-checkout-error-macro               pass      pass    yes    6
careful-checkout-errors                    pass      pass    yes    6
careful-checkout-errors-split-title-body   pass      pass    yes    6
careful-renewal-declined-banner            pass      pass    yes    6
careful-renewal-failed-email               pass      pass    yes    4
careless-checkout-error-macro              fail      fail    yes    6
careless-checkout-errors                   fail      fail    yes    6
careless-renewal-declined-banner           fail      fail    yes    6
careless-renewal-failed-email              fail      fail    yes    4
charge-status-without-next-step            fail      fail    yes    6
decline-hedged-as-unknown                  fail      fail    yes    6
declined-says-order-not-placed             fail      fail    yes    6
fixture-files-unchanged                    pass      pass    yes    8
macro-quotes-errors-without-charge-status  fail      fail    yes    6
not-selected-files                         skip      skip    yes    0
one-message-without-charge-status          fail      fail    yes    6
other-company-checkout-strings             pass      pass    yes    6
other-company-payment-failure-email        pass      pass    yes    4
selected-files-on-other-subjects           pass      pass    yes    6
timeout-maybe-charged-no-outcome           fail      fail    yes    6
timeout-says-not-charged                   fail      fail    yes    6

```

No mismatch, refusal or error in the last round. Luna's 7 decisions on careful-checkout-error-macro
(6 elsewhere) is one extra request the proxy logged; the eval passed with no error. All proof
folders are deleted.

## Verification

- `loadEntry` passes; `agentests validate` passes with the final `gate/` installed in a fresh copy of
  the fixture.
- The rule text is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md` (59 lines), and
  neither its first sentence nor phrases such as "have not been charged" appear in `fixture/`.
- The fixture's 10 Node tests pass as shipped; no cache, `.git` or `node_modules`.
- Only `benchmarks/dataset/payment-errors-state-charge/` is new.

## Notes for the orchestrator

- Research or triage: the research `scope` is `cross-file` (messages mapped to failure modes in
  docs/payments/failure-modes.md); the triage's policy fact makes it single-file, and that worked.
  Research task 4 names no file: the fixture README says banners live in locales/en.json and are
  listed in app.config.json, so the banner has an obvious home. The fixture's failure-modes note
  states what happens to the money and what the customer can do, as the research fixture
  proposes; it gives facts, not the rule.
- Companions: the select (glob plus grep) also matches files in four other business fixtures, so
  by the harness's rule this Test will not be drawn as a companion for them:
  apologise-only-when-at-fault (emails/welcome.md, support/macros/card-delivery.md,
  change-address.md), form-errors-say-how-to-fix (locales/en.json, its payment-details step),
  incident-updates-concrete-impact (support/macros/billing/refund-timing.md) and
  plainspoken-no-hype (emails/welcome.md). Three of those were being built at the same time, so
  this may change.
- Possible run-to-run wobble on luna: one-message-without-charge-status (caught in rounds 1 to 3
  and 5, missed in 4) and charge-status-without-next-step (missed in round 2 only).
- Each assertion's decide has two alternatives, so a selected file reaching all three model stages
  costs up to six decision calls.

## What I could not verify

- No agent run: whether an untold agent writes "Payment failed. Please try again."-style messages,
  and whether the skill's description gets it loaded next to nine others.
- The gate on real agent output, and on companion fixtures beyond the two other-company evals.
