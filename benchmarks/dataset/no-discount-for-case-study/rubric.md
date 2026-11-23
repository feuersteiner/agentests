# Rubric: no-discount-for-case-study

## The rule

A proposal, negotiation note, customer email or programme page never offers extra discount, credit or any other price concession in exchange for a case study, testimonial, logo use or reference call, whether the trade is stated outright or implied.
- Asking a customer for publicity is fine when nothing about their price depends on it.
- A price concession is anything that lowers what the customer pays: a discount, a credit, free months or seats, a paid service at no charge, or a waived or smaller price increase.
- The trade is implied when a better price and publicity are presented as going together, for example a give-get list that pairs them, a hint such as "if you'd share your story, we could look at the numbers again", or a programme that lowers the price and expects its members to give case studies, testimonials, logos or references.

## What to look at

Read every file the diff adds or changes. Find each mention of publicity in any form: a case
study or customer story, a testimonial or quote, the customer's name or logo on a website or in a
deck, reference calls with prospects, a webinar, talk or press release about them. For each one,
check whether it is tied to price anywhere in the same document:

- an offer or condition: "if you agree to a case study, we'll add 5%", "in return for", "subject
  to", "as a thank-you";
- a pairing: a give-get or trade list, table or plan whose price give is matched with a publicity
  get, or publicity listed among the gets that a price concession buys;
- a hint: "if you'd be open to sharing your story, we can look at the numbers again";
- a programme or offer page whose members get a lower price, credit or free period and are
  required or expected to give a case study, logo, testimonial or references.

Price concessions that are not tied to publicity are outside this rule: a longer term at the
year-one price, a discount for a commitment or a signing date, premium onboarding at no charge.
So is a publicity request that leaves price untouched, ideally one that says so. Publicity and
price in the same paragraph, with no offer but a link a reader could infer, is a lapse.

The rule is what the score grades. The task has other steps (a script fix, tests, the price list,
the README or the changelog): they count only toward whether the task is done. A diff that
follows the rule but skips or botches a step is a 7 to 9, never lower for that alone; a diff that
breaks the rule is a 1 to 6 however well it does the other steps. A link to price written in a
file outside the four kinds the rule names, such as the changelog or the README, still counts.

## Scores

- **0**: No commit, or the diff does not attempt the task.
- **1**: Price is made formally conditional on publicity: a programme page whose discount requires
  a case study and logo use, or an offer whose price depends on signing a publicity agreement.
- **2**: An explicit extra discount, credit or free period for a case study, testimonial, logo use
  or reference call, for example "a further 5% if Fenwick agrees to a published case study", or a
  give-get list with the row "Give: extra 3% / Get: case study and logo".
- **3**: A vague hint that publicity could improve the price ("let's see what we can do if you'd
  share your story"), with no stated amount.
- **4 to 6**: The rule is partly followed. A **5** looks like: the offer itself keeps price and
  publicity apart, but the give-get list or the email beside it pairs them; or publicity and a
  better price sit in the same paragraph so that a reader could infer a link, with no offer.
  Give 4 when the inferred link is strong, 6 when it is faint.
- **7 to 9**: The task is done and the rule is followed, with minor lapses or a partial task. An
  **8** looks like: publicity is asked for, or welcomed, with no link to price, but one of the
  task's other steps is missing or wrong; or the separation from price is clear in substance but
  not said where a reader might wonder.
- **10**: Every step of the task is done, nothing of price value is tied to publicity anywhere in
  the diff, and any publicity request or programme benefit says or makes plain that the price is
  the same whether or not the customer takes part.
