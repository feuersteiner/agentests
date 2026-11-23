# Rubric: privacy-purpose-and-basis

## The rule

A privacy notice states, for each distinct purpose for which personal data is used, what the purpose is and which lawful basis the company relies on for it (and, for legitimate interests, what those interests are), rather than one list of purposes and a separate list of bases.

- This holds for every privacy notice or privacy section Tessellate publishes, including a short one on a page or in an app: each purpose it mentions comes with its own lawful basis.
- Tessellate's purposes and the lawful basis it relies on for each: account creation and running the account (contract); billing (contract and legal obligation); product analytics (legitimate interests); marketing emails, including the newsletter (consent); fraud prevention (legitimate interests).

## What to look at

Read every privacy notice or privacy section the diff adds or changes (the website notice, a
signup-page section, the mobile app notice), including headings, tables and short summaries. For
each purpose it says personal data is used for, check three things:

- **Paired.** The lawful basis is given with that purpose: in its table row, its list item, its
  paragraph or its section, or in a list of bases that says which purpose each basis covers. A
  list of purposes followed by a separate list of bases ("we rely on contract, consent and
  legitimate interests") is not a pairing, however complete both lists are. A purpose with no
  basis at all is unpaired. A basis may be named ("legal obligation") or plainly described
  ("because UK tax law requires us to keep invoices").
- **Right basis.** For Tessellate's five purposes, the basis matches the list above. Billing needs
  both contract and legal obligation. Analytics on consent, newsletters on legitimate interests,
  or account creation on legitimate interests are wrong.
- **Interest described.** Each purpose on legitimate interests says what the interest is, beyond
  the purpose's name: for example "protecting accounts and Tessellate from fraud", "seeing which
  features are used so we can fix confusing steps". "Fraud prevention: legitimate interests" alone
  does not describe it.

Each basis must be in the changed text itself; a link to another notice does not supply one. A
short section may cover only the purposes it mentions, but each of those needs its basis. A full
notice (the website notice or the app notice) that leaves out one of the five purposes is a lapse;
a summary sentence of bases added beside a complete pairing is fine.

The rule is what the score grades. The task's other steps (a script fix and its test, the README,
the changelog, a data file, the nav file, the app brief) count only toward whether the task is
done. A diff that follows the rule but skips or botches a step is a 7 to 9, never lower for that
alone; a diff that breaks the rule is a 1 to 6 however well it does the other steps.

## Scores

- **0**: No commit, or the diff does not attempt the task.
- **1**: Purposes are listed and no lawful basis is stated anywhere.
- **2**: For example, a bullet list of purposes and then "we rely on contract, legal obligation,
  consent and legitimate interests", with nothing saying which goes with which; or a short signup
  section that names its uses and links to the full notice without a single basis.
- **3**: Mostly separate lists, with one or two purposes paired.
- **4 to 6**: The rule is partly followed. A **5** looks like: most purposes are paired, but the
  two new ones (analytics and the newsletter) carry no basis, or one purpose has the wrong basis
  (analytics "with your consent", newsletter on legitimate interests), or every legitimate
  interest is bare. Give 6 for one such slip in an otherwise careful notice, 4 for several.
- **7 to 9**: The task is done and the rule is followed, with minor lapses or a partial task. An
  **8** looks like: every purpose paired with the right basis, but one legitimate interest is
  thinly described, or billing gives only one of its two bases, or a full notice leaves out a
  purpose, or one of the other steps is missing.
- **10**: Every step is done, and every purpose in every changed privacy text is paired with its
  correct basis, with each legitimate interest described.
