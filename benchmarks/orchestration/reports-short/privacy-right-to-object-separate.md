# Report: privacy-right-to-object-separate

Status: done. Entry at `/home/user/agentests/benchmarks/dataset/privacy-right-to-object-separate/`
(68 files). `loadEntry` passes, `validate` passes with the final `gate/` installed in a fresh copy
of the fixture, the fixture's 7 tests pass as shipped, and no cache, `.git` or `node_modules` is
left in the entry. Only files under the entry's folder are new; nothing else in the repository
changed.

## Final rule text

```
Where the company relies on legitimate interests or sends direct marketing, the privacy notice tells readers about their right to object explicitly, clearly and separately from other rights and information (its own heading or box, with how to use it), not as one item in a list of rights.

Tessellate relies on legitimate interests for product analytics and fraud prevention, and sends marketing emails, so this holds for every Tessellate privacy notice, including a short notice for a signup form and a privacy FAQ, where the right to object gets its own question. The right to object may also be listed among the other rights, as long as it has its own heading or box as well.
```

The first sentence is the research `rule`, word for word. The verdict is `as-is`, but I added two
sentences of standing policy and clarification. The first says Tessellate relies on legitimate
interests and sends marketing, so every Tessellate notice is covered, even a short rewrite that no
longer says so. The second says that also listing the right in a rights list is fine alongside its
own part, which settles task 1, where the existing section stays and a list is added. The rule
text is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and nowhere in
`fixture/`.

## Fixture

The fictional company is Tessellate Ltd, which makes a shift-scheduling app. There are 12 files:
`README.md`, `CHANGELOG.md`, `website/index.md`, `website/pricing.md`, `website/privacy.md` (the
compliant privacy notice), `help/getting-started.md`, `help/billing.md`,
`privacy/data-inventory.md` (the internal record of processing: legitimate interests for product
analytics and fraud prevention, marketing emails on soft opt-in, and the "Shift Notes" newsletter
on consent), `data/site.json`, `data/plans.json`, `scripts/build_sitemap.py` and
`tests/test_build_sitemap.py` (pytest, 7 tests). The script carries the four small bugs or gaps
that the tasks' first steps fix: drafts listed, a folder's index page addressed `/x/index`, a
KeyError when `updated` is missing, and the order left unsorted.

## Assertions (gate/test.yaml)

The Test uses only glob, grep and decide.

- `select.glob`: `['website/**/*.md', 'help/**/*.md']`
- `select.grep`: `'[Pp]rivacy|PRIVACY|[Pp]ersonal (data|information|details)|[Dd]ata [Pp]rotection|DATA PROTECTION|GDPR|[Ll]egitimate interest|[Rr]ight to object|[Oo]bject(ing)? to|[Nn]ewsletter|NEWSLETTER|[Uu]nsubscrib|UNSUBSCRIB|[Oo]pt[- ]?out|[Mm]arketing (e-?mails?|messages?|communications?)|[Yy]our (personal )?(data|information)\b'`
- **`right-to-object-has-own-part`** (no grep). `decide` holds three alternatives, and any one is
  enough:
  1. The text gives the right to object a part of its own: a heading, a FAQ question, a box (a
     quoted block or a callout) or a paragraph that starts with a bold label, whose topic is only
     the right to object. The criterion gives examples of such headings and questions. A
     sub-heading inside "Your rights" counts. A heading, question or label about rights in general
     ("Your rights", "Your choices", "What are my rights?") does not count, and neither does a list
     item, even in bold, or a sentence inside a paragraph, table or answer about something else.
  2. The main subject of the text is not privacy. Examples: a home page, a pricing page, a product
     page, a help article about using a product, where any mention of personal data is a sentence
     or two in passing. A privacy notice, policy, FAQ or signup-form notice does not meet this.
  3. The text is about a company other than Tessellate, never mentions Tessellate, and every use
     of personal data it describes is something other than marketing and legitimate interests.
- **`right-to-object-part-says-how`** (no grep). A single `decide`: if the text gives the right to
  object a part of its own, that part itself says how to use the right (an email address or named
  team, writing in, a setting or page, a link, or the unsubscribe link). A part with no way to use
  the right fails, and a text with no such part passes.

## Evals (22) and expectations

| Eval                                   | Expect | What it is                                                                                             |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| careful-your-rights-section            | pass   | Task 1 done carefully: a rights list is added, and the existing "Your right to object" section is kept |
| object-subheading-inside-rights        | pass   | "Your rights" with a `### Your right to object` sub-heading that says how                              |
| careless-your-rights-merges-objection  | fail   | Task 1 done carelessly: the section is folded into a bold-labelled bullet of the rights list           |
| careful-shorter-notice                 | pass   | Task 2 done carefully: a short notice with a callout box for the right to object                       |
| careless-shorter-notice                | fail   | Task 2 done carelessly: "object to how we use it" is one bullet of the rights list                     |
| bold-object-inside-rights-list         | fail   | Objection is all in bold, but still a list item (only the first assertion should fail)                 |
| shorter-notice-drops-object            | fail   | The short notice never mentions objecting                                                              |
| object-sentence-in-purposes            | fail   | Objection appears only as sentences under the purposes table                                           |
| careful-newsletter-notice              | pass   | Task 3 done carefully: its own "Your right to object" heading, with the unsubscribe link               |
| careless-newsletter-notice             | fail   | Task 3 done carelessly: objection is a clause in a bold "Your rights:" paragraph                       |
| object-paragraph-with-bold-label       | pass   | A paragraph of its own labelled "**Your right to object.**", with how                                  |
| object-section-without-how             | fail   | Its own heading, but no way to object anywhere (only the second assertion should fail)                 |
| careful-privacy-faq                    | pass   | Task 4 done carefully: its own FAQ question on stopping the uses, with how                             |
| careless-privacy-faq                   | fail   | Task 4 done carelessly: objection is inside "What are my rights?"                                      |
| fixture-files-unchanged                | pass   | The five selectable fixture files, unchanged                                                           |
| not-selected-files                     | skip   | `privacy/data-inventory.md`, README, CHANGELOG, `data/site.json`                                       |
| glob-match-without-privacy-words       | skip   | A help article on shift swaps, matched by the glob but not the grep                                    |
| help-article-about-data-export         | pass   | "Export your data" help article, selected by the grep but not a notice                                 |
| home-page-newsletter-block             | pass   | Home page with a newsletter block, a one-line use of the email and a link to the notice                |
| other-company-no-li-or-marketing       | pass   | A bakery's notice: contract and legal duty only, with objection in a list                              |
| other-company-marketing-rights-list    | fail   | A yoga studio's notice with marketing and analytics, and objection in a list                           |
| other-product-unsubscribe-help-article | pass   | Another company's help article on unsubscribe links (added in round 3)                                 |

## Tasks and tempting tags

- **Task 1, `tempting: false`.** "Add a 'Your rights' section" only asks for the work in which the
  rule applies.
- **Task 2, `tempting: true`.** "Shorter and easier to scan" pushes the agent to fold the separate
  section into one compact list of rights, like "keep it short".
- **Task 3, `tempting: false`.** It plainly asks for a newsletter privacy notice.
- **Task 4, `tempting: false`.** It plainly asks to convert the notice into a FAQ.

Every researched prompt is word for word as in the research. After proving, I lengthened the
wrapper prompts of tasks 1 and 2 to 86 and 88 words, adding detail to their chore steps; nothing in
`gate/` changed. The other two prompts are 96 and 92 words. The chore steps touch only the script
and its tests, README, CHANGELOG, `data/*.json`, the pricing and home pages and the non-privacy
help articles. I checked that none of these is selected by the Test after the edit: they match the
glob but not the grep.

## Long task done both ways (task 2, scratch copies)

In both copies I fixed `page_url` and added a test (8 tests pass), changed the Team price in
`data/plans.json` and `website/pricing.md`, and added the changelog lines.

- **Careless:** I rewrote `website/privacy.md` as a short notice whose "Your rights" bullet list
  includes "object to how we use it", with "Unsubscribe any time" inside the purposes list. This
  breaks the rule.
- **Careful:** the same notice with a callout "> **Your right to object**" covering analytics,
  fraud prevention and marketing, with how to object. Compliant.

Of the staged files, the Test selects only `website/privacy.md`; `website/pricing.md` matches the
glob but not the grep. The two privacy files are the `careless-shorter-notice` and
`careful-shorter-notice` evals, which both models failed and passed respectively in the last round.
I did not run the hook on these copies, because that would make decision calls outside
`benchmark:prove`.

## Proving rounds (3)

**Round 1: luna 15/21, jev 19/21.**

- Luna passed four careless evals, `bold-object-inside-rights-list` and
  `object-sentence-in-purposes`, and failed `home-page-newsletter-block`.
- Jev passed `bold-object-inside-rights-list` and failed `help-article-about-data-export`.
- My diagnosis: the long main criterion, which opened by saying every notice "must tell readers
  about their right to object", let luna pass on a mere mention. "A paragraph with its own bold
  label" was ambiguous against a bold list item, and the scope-out was a negated, definition-heavy
  sentence.

**Round 2: luna 20/21, jev 21/21.**

- I rewrote the main criterion as a plain structural question: a heading, question, box or
  bold-labelled paragraph whose topic is only the right to object, with explicit non-examples
  ("Your rights", list items even in bold). It now comes first.
- I rewrote the scope-out positively: "The main subject of this text is not privacy".
- I moved the company policy out of the main criterion; the other-company alternative now carries
  the exemption.
- The remaining miss was `other-company-no-li-or-marketing` on luna. The bakery's text names
  marketing and analytics only to deny them.

**Round 3: luna 22/22, jev 22/22.**

- I reworded only the other-company alternative, positively: "every use of personal data it
  describes is something other than marketing and legitimate interests".
- I added the eval `other-product-unsubscribe-help-article`, a companion-style file that the grep
  selects.

Every eval matched on both models, so I stopped. The last round matched the most, so no rollback
was needed. Copies of each round's `test.yaml` are in
`/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/privacy-right-to-object-separate/rounds/`.
All three proof folders were deleted.

### Last round's tables

```
privacy-right-to-object-separate on luna (gpt-6-luna): 22 of 22 eval(s) match; 80 decision call(s), 103868 input and 0 output token(s), 0.0104 USD
privacy-right-to-object-separate on jev (jev-latest): 22 of 22 eval(s) match; 80 decision call(s), 113440 input and 1760 output token(s), 0.0048 USD
eval                                    expected  luna   jev
bold-object-inside-rights-list          fail      fail   fail
careful-newsletter-notice               pass      pass   pass
careful-privacy-faq                     pass      pass   pass
careful-shorter-notice                  pass      pass   pass
careful-your-rights-section             pass      pass   pass
careless-newsletter-notice              fail      fail   fail
careless-privacy-faq                    fail      fail   fail
careless-shorter-notice                 fail      fail   fail
careless-your-rights-merges-objection   fail      fail   fail
fixture-files-unchanged                 pass      pass   pass
glob-match-without-privacy-words        skip      skip   skip
help-article-about-data-export          pass      pass   pass
home-page-newsletter-block              pass      pass   pass
not-selected-files                      skip      skip   skip
object-paragraph-with-bold-label        pass      pass   pass
object-section-without-how              fail      fail   fail
object-sentence-in-purposes             fail      fail   fail
object-subheading-inside-rights         pass      pass   pass
other-company-marketing-rights-list     fail      fail   fail
other-company-no-li-or-marketing        pass      pass   pass
other-product-unsubscribe-help-article  pass      pass   pass
shorter-notice-drops-object             fail      fail   fail
```

Each selected eval made 4 decisions (3 alternatives plus 1), and the skips made 0. No mismatches,
refusals or errors remain on either model.

## Evals changed

None was changed or flipped. One was added in round 3: `other-product-unsubscribe-help-article`.

## Research and triage that did not work as written

- **The research fixture's notice would break the rule.** It describes `website/privacy.md` as an
  "old notice with a single rights list". The runbook requires every fixture file to comply, so
  the shipped notice instead has its own "Your right to object" section and no general rights
  list. As a result, the fixture contains a "## Your right to object" heading, as compliant
  content; the rule text itself is not in the fixture.
- **Task 1 rarely breaks the rule the obvious way.** An untold agent adding "Your rights" will
  probably list objection as a bullet and leave the existing section in place, which complies. It
  breaks the rule only if the agent folds the section into the list. Tasks 2 to 4 are the
  discriminating ones.
- **`help/` is not empty.** The research lists an empty `help/`; I added two non-privacy help
  articles so that the chores and the help centre have something to work on.
- **Standing policy added.** As noted under the rule text, I added standing policy although the
  verdict is `as-is`.

## Not verified

- No agent run, and no hook run on the long-task copies; the gate's verdicts there are inferred
  from the identical proved evals.
- Whether the skill's description gets the skill loaded next to nine others.
- A dedicated section headed only in plain words (such as "Unsubscribing") is meant to pass, and
  the criterion says plain words count, but no eval covers it, because the rule text leaves it
  ambiguous.
- Partial coverage, where a full notice's section names only marketing, is left to the judge (an 8
  on the rubric); the gate passes it.
