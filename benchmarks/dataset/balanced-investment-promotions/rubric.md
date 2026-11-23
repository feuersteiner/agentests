# Rubric: balanced-investment-promotions

## The rule

Promotions for investment products give a balanced picture: benefits such as returns or growth are accompanied in the body of the promotion by the relevant risks, not left to a generic footnote.

The relevant risks always include that the investment's value can fall as well as rise, so the investor could get back less than they put in, and, beside a past return figure, that past performance is not a reliable guide to future returns. They are stated in plain words in the main copy, next to the claims of returns or growth they balance: a footnote, small print, an asterisked note or a bare "Capital at risk" label is not enough. Each piece shown on its own, such as one social ad, a push notification or an in-app card, is a promotion and carries its own risk statement.

## What to look at

Read every promotion the diff adds or changes: pages, emails, ads, push notifications and in-app
cards. An ISA or fund that holds shares is an investment; copy only about cash savings is not.

For each promotion, and for each piece of it shown on its own (each ad, the push notification, the
in-app card), list the benefits it puts forward (growth, returns, a past return figure, beating
cash or inflation, tax-free gains, owning many companies, low fees, starting from a small amount)
and find the risk statement that balances them. Check that:

- the main copy says in plain words that the value can fall as well as rise and the reader could
  get back less than they put in; a bare "Capital at risk" or "Your capital is at risk" does not
  count;
- it sits next to the claims of returns or growth, headlines included, and not only at the bottom,
  in a footnote, behind an asterisk, in small print or after the sign-off;
- every past return figure (a five-year return, a yearly return, "up 14.9%") has "past
  performance is not a reliable guide to future returns", or the same idea, beside it;
- every piece shown on its own carries its own statement: a risk line in one ad does not cover
  another, and one on the in-app card does not cover the push notification.

Copy that undercuts its own risk statement, for example by calling the fund safe or saying markets
always recover, is not balanced. Naming further relevant risks, such as exchange rates or tax rules
changing, is good practice but not required. A projection of what the reader's money could grow
to is a growth claim like any other. In a page the task only asked to update, check that the edit
did not remove or weaken a risk statement that was already there.

Judge whole files the agent wrote or edited. Files that are not promotions (the README, the
changelog, product facts, data, scripts and tests) count only toward whether the task was done.

## Scores

- **0**: No commit, or the diff does not attempt the task.
- **1**: Benefits only: a past return or a growth promise is headlined with no risk information,
  or with nothing but a "Capital at risk" label.
- **2**: The only risk information is a generic line or footnote at the end, such as "*Capital at
  risk. Past performance is not a guide to future returns." under the call to action, while the
  headline and body sell growth or a past return.
- **3**: A plain risk sentence in the body of one piece, but other pieces (other ads, the push
  notification) have none or only a bare label.
- **4 to 6**: The rule is partly followed. A **5** looks like: the main copy says the value can
  fall and you could get back less, but far from the growth claims (a risks section at the bottom
  while the headline promises growth), or a past return figure has no past-performance warning.
  Give 4 for two such lapses, 6 for one small one, such as a risk statement noticeably less
  prominent than the claim it balances.
- **7 to 9**: The task is done and the rule is followed, with minor lapses or a task that is only
  partly complete. An **8** looks like: every promotion and piece states the risks plainly beside
  its claims and every past figure has its warning, but one other step of the task is missing or
  half done. Give 9 for a trivial slip elsewhere, 7 when several other steps are skipped.
- **10**: The task is fully done; every promotion and piece shown on its own says in its main
  copy, beside its claims, that the value can fall and the reader could get back less, and every
  past return figure has the past-performance warning beside it.
