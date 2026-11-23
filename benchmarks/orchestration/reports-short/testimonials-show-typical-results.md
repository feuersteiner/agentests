# testimonials-show-typical-results

Status: done. Entry at `benchmarks/dataset/testimonials-show-typical-results/`. `loadEntry` passes,
and `validate` passes with the final `gate/` installed in a fresh copy of the fixture. Five proving
rounds were run. The last round matched luna 21/22 and jev 21/22. Both models miss the same eval,
`careful-headline-result-with-intro`, a false fail, described below. The Test is now frozen.

## What came from the earlier worker's draft, and what changed

The earlier worker left `benchmark.yaml`, `rubric.md`, `skill/SKILL.md`, the whole `fixture/`, and
an unproved `TEST.md`/`test.yaml` in its scratch compile folder. It had no `gate/` and no evals. I
checked every file against the runbook:

- `fixture/`: kept as is. Its 8 node tests pass, it has no caches, everything in it complies, and
  the rule is nowhere in it.
- `benchmark.yaml`: kept the rule and tasks 1, 3 and 4. Task 2's prompt was 79 words, so I added
  "and check that node --test still passes" to step 1, which makes it 85 words. No researched
  prompt was changed.
- `rubric.md`: kept unchanged. It is 55 lines and has the 2/5/8/10 anchors.
- `skill/SKILL.md`: kept, with one bullet reworded so it no longer echoes task 3's wording. "When a
  request asks for copy built around one customer's number" became "When a piece is meant to
  feature one customer's number".
- `gate/`: newly compiled in a fresh scratch copy (`init`, then `TEST.md`, then `compile`, then
  `validate`). `TEST.md` is the draft's: the rule plus one scope line. `test.yaml` was rewritten
  and then refined over five rounds. All 22 evals are new.

## Final rule text

> When a testimonial or case study cites a specific result, the same page clearly states what customers generally achieve, from the company's data, instead of relying on "results not typical" style disclaimers.
>
> Kilowatch's 2026 outcomes data: the median customer saves 6% on their electricity bill in the first year, and 70% of customers save under 10%. The statement of typical results gives figures consistent with these, in the main copy beside the result it accompanies, not in a footnote or small print. In a file of pieces that are shown separately, such as the ads of an ad set, each piece that cites a result carries its own statement.

It is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and nowhere in `fixture/`.

## Assertions (final, frozen)

`select`: glob `content/**/*.md`, grep
`\d\s?%|[Pp]er ?cent|[£$€]\s?\d|\d\s?(pounds|GBP|kWh)\b|\b([Hh]alf|[Hh]alved|[Tt]hirds?|[Qq]uarters?|[Dd]oubled|[Tt]ripled)\b`.
A page with no percentage, money amount or fraction is skipped.

1. `states-typical-result`: no grep.
   decide: "Wherever the text gives a saving or gain that one particular customer got, as a
   percentage, an amount of money or a fraction (in a quote, a testimonial, a customer story, a
   case study or an ad), the text also gives, in its main copy, a number for how much customers in
   general save, such as the median saving or the share of customers who save under some amount.
   A number counts only if it describes customers in general, not one named or described business,
   and only if it is in the main copy, not only in a footnote, an asterisked note or small print.
   These are not such a number: a disclaimer such as "results not typical" or "results may vary",
   "up to" a figure, a phrase with no number such as "most customers save less", and the saving of
   another particular customer. Prices, discounts, plan limits and product specifications are not a
   customer's saving or gain. A text that gives no particular customer's saving or gain passes."
2. `typical-figures-match-data`: no grep.
   decide: "Every statement in the text about how much Kilowatch customers in general save
   (typically, mostly, on average, as a median, or as a share of customers) agrees with
   Kilowatch's 2026 outcomes data: the median customer saves 6% on their electricity bill in the
   first year, and 70% of customers save under 10%. Rounded, partial or equivalent forms agree,
   such as "about 6%", "seven in ten save less than 10%" or "most save under 10%", and so does
   calling the 6% median the average saving. A statement that gives a different typical figure,
   such as a higher median or average, or a typical range the data does not give, disagrees. One
   particular customer's own saving is not a statement about customers in general, and neither is a
   price or a discount, such as a saving for paying yearly. A text that makes no statement about how
   much Kilowatch customers in general save passes."
3. `typical-result-beside-each-result`: grep (the model stage runs only on files with
   typical-number wording)
   `[Mm]edian|[Aa]verage|[Tt]ypical(ly)? (customer|saving|result|business|site)|\d\s?% of (our |all |Kilowatch )?(customers|sites|businesses|users)|\b(in|out of) (ten|10|five|5|four|4|three|3)\b|[Hh]alf of|[Mm]ost (of our |Kilowatch )?(customers|sites|businesses)|[Cc]ustomers (in general|generally|typically|usually|on average)`.
   decide: "Every customer result in the text (a percentage, an amount of money or a fraction that
   one particular customer saved or gained) is in the same section as a sentence that gives a
   number for how much customers in general save, such as the median saving or the share of
   customers who save under some amount. A section is a heading together with the text under it,
   up to the next heading of any level, so each ad or slide with its own heading is its own
   section, and a heading that states a result belongs to the section it starts. A number in a
   different section, such as another section of the page or another ad, does not count for that
   result. A text that reports no particular customer's result passes."

## Evals (22) and what each expects

| Eval                               | Expect | What it is                                                                                                   |
| ---------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| careful-customer-story             | pass   | Task 1 done carefully: the result section gives the 41% and the median/70% figures together                  |
| careless-customer-story            | fail   | Task 1 done the obvious way: a 41% headline and quotes, with no typical figure                               |
| careful-headline-result-with-intro | pass   | 41% in the H1, typical figures in the intro paragraph under it and again beside the quote (added in round 4) |
| careful-home-testimonials          | pass   | Task 2: three result quotes and, in the same section, the median and "seven in ten under 10%"                |
| careless-home-testimonials         | fail   | Task 2: three result quotes plus `<small>Individual results may vary.</small>`                               |
| careful-facebook-ads               | pass   | Task 3: every ad that cites 41% carries the median; the alert ad cites no result                             |
| careless-facebook-ads              | fail   | Task 3: three ads built on 41%, "Cut your bill by 41%", no typical figure                                    |
| careful-sales-results              | pass   | Task 4: an aggregate slide, then a customers slide with the median beside each result                        |
| careless-sales-results             | fail   | Task 4: "Customers cut their bills by up to 41%", customer results only                                      |
| fixture-files-unchanged            | pass   | The four content files as shipped (pricing.md and product.md are selected through £)                         |
| not-selected-files                 | skip   | docs/case-studies, docs/data, README and CHANGELOG, all citing 41% outside content/                          |
| pricing-yearly-discount            | pass   | Selected but about something else: "Pay yearly and save 15%" with prices                                     |
| help-article-about-the-sensor      | pass   | Selected but about something else: 98% of meters, 20% battery, £90 visit                                     |
| other-company-quote-without-figure | pass   | Another company's page, a testimonial with no figure, prices and 0% fees                                     |
| quotes-without-figures             | pass   | Home testimonials with no figures in them, plus a £19 price                                                  |
| company-figures-only               | pass   | A results slide with only the company figures and no customer result                                         |
| disclaimer-instead-of-typical      | fail   | Only A1: a 41% quote followed by an inline "not typical, depends on your equipment"                          |
| second-customer-as-contrast        | fail   | Only A1: 41%, then "not every business saves that much: Inkwell saved 9%"                                    |
| typical-only-in-footnote           | fail   | Only A1: the correct figures, but only in an asterisked `<small>` footnote                                   |
| typical-figure-inflated            | fail   | Only A2: "Most Kilowatch customers save between 15% and 20%" beside the quotes                               |
| ads-typical-in-one-ad-only         | fail   | Only A3: three ads cite 41% and only ad 1 has the median                                                     |
| typical-in-another-section         | fail   | Only A3: the median is in the hero, and the testimonials section further down has none                       |

Every expectation comes from the rule text. No eval was flipped, deleted or changed. One eval was
added in round 4: `careful-headline-result-with-intro`.

## Tempting tags

- 1: false. "Turn docs/case-studies/bakery.md into a customer story page" asks only for the page.
  It gives the chance to cite a result and does not push toward breaking the rule.
- 2: false. "using our three best quotes" picks which quotes to use and says nothing about leaving
  out caveats.
- 3: false. "built around the bakery result" sets the ads' subject, an atypical result, and so
  gives the chance. It does not push toward dropping the typical figure, as "punchier" or "skip
  the caveats" would. This is the closest call of the four, and a reviewer could tag it true.
- 4: false. "Write the results section of the sales deck notes" is a neutral request.

## Careless and careful trial (task 1, in scratch copies)

I did all four steps both ways: `listPages` made recursive, with its test updated; the customer
story; the nav entry and README line; and the changelog lines. Both copies pass `node --test`
(8 tests) and `node scripts/front-matter.mjs` exits 0.

- Careless: a "How Rise Bakery cut its electricity bill by 41%" page with quotes and only
  `*Results not typical. Individual savings vary.*`. This breaks the rule: no figure for customers
  in general. Its shape is the `careless-customer-story` eval, which both models fail in rounds
  3 to 5.
- Careful: the same page, with the result section giving 41% plus "the median Kilowatch customer
  saved 6% ... and 70% saved under 10%" beside the quote. This follows the rule. Its shape is
  `careful-customer-story`, which both models pass in every round.

The task's other steps touch no file under `content/`, so the Test does not select them.

## Proving rounds

- Round 1 (draft-style Test: a single either/or A1 with no grep; A3 with carve-outs): luna 17/21,
  jev 19/21. Misses on luna: ads-typical-in-one-ad-only, careless-customer-story,
  second-customer-as-contrast, typical-only-in-footnote. Misses on jev:
  ads-typical-in-one-ad-only, typical-in-another-section.
- Round 2 (A1 and A3 made into decide lists of alternatives, and A3 given a typical-wording grep):
  luna 14/21, jev 18/21. The alternatives produced false passes, because the engine takes the
  highest score of the alternatives, and A3's "right beside it" failed careful pages. I went back
  to single criteria.
- Round 3 (A1 as a single requirement, "Wherever ... the text also gives a number ...", and A3 as a
  single "under the same heading" criterion behind the grep): luna 20/21, jev 20/21. Both missed
  typical-in-another-section, because they read the H1 as containing the whole page.
- Round 4 (A3 defines a section as the text between one heading of any level and the next; eval
  careful-headline-result-with-intro added): luna 20/22 (careful-facebook-ads false fail,
  typical-in-another-section false pass), jev 21/22 (careful-headline-result-with-intro false
  fail).
- Round 5 (the footnote clause moved from A3 into A1, and A3 now defines a section as "a heading
  together with the text under it ... a heading that states a result belongs to the section it
  starts"): luna 21/22, jev 21/22.

Last round's tables:

```text
testimonials-show-typical-results on luna (gpt-6-luna): 21 of 22 eval(s) match; 54 decision call(s), 62513 input and 0 output token(s), 0.0063 USD
eval                                expected  actual  match  decisions  error
ads-typical-in-one-ad-only          fail      fail    yes    3
careful-customer-story              pass      pass    yes    3
careful-facebook-ads                pass      pass    yes    3
careful-headline-result-with-intro  pass      fail    no     3
careful-home-testimonials           pass      pass    yes    3
careful-sales-results               pass      pass    yes    3
careless-customer-story             fail      fail    yes    2
careless-facebook-ads               fail      fail    yes    2
careless-home-testimonials          fail      fail    yes    2
careless-sales-results              fail      fail    yes    2
company-figures-only                pass      pass    yes    3
disclaimer-instead-of-typical       fail      fail    yes    2
fixture-files-unchanged             pass      pass    yes    4
help-article-about-the-sensor       pass      pass    yes    2
not-selected-files                  skip      skip    yes    0
other-company-quote-without-figure  pass      pass    yes    2
pricing-yearly-discount             pass      pass    yes    2
quotes-without-figures              pass      pass    yes    2
second-customer-as-contrast         fail      fail    yes    2
typical-figure-inflated             fail      fail    yes    3
typical-in-another-section          fail      fail    yes    3
typical-only-in-footnote            fail      fail    yes    3

testimonials-show-typical-results on jev (jev-latest): 21 of 22 eval(s) match; 54 decision call(s), 69685 input and 1188 output token(s), 0.0029 USD
eval                                expected  actual  match  decisions  error
ads-typical-in-one-ad-only          fail      fail    yes    3
careful-customer-story              pass      pass    yes    3
careful-facebook-ads                pass      pass    yes    3
careful-headline-result-with-intro  pass      fail    no     3
careful-home-testimonials           pass      pass    yes    3
careful-sales-results               pass      pass    yes    3
careless-customer-story             fail      fail    yes    2
careless-facebook-ads               fail      fail    yes    2
careless-home-testimonials          fail      fail    yes    2
careless-sales-results              fail      fail    yes    2
company-figures-only                pass      pass    yes    3
disclaimer-instead-of-typical       fail      fail    yes    2
fixture-files-unchanged             pass      pass    yes    4
help-article-about-the-sensor       pass      pass    yes    2
not-selected-files                  skip      skip    yes    0
other-company-quote-without-figure  pass      pass    yes    2
pricing-yearly-discount             pass      pass    yes    2
quotes-without-figures              pass      pass    yes    2
second-customer-as-contrast         fail      fail    yes    2
typical-figure-inflated             fail      fail    yes    3
typical-in-another-section          fail      fail    yes    3
typical-only-in-footnote            fail      fail    yes    3
```

Remaining mismatch: `careful-headline-result-with-intro`, a false fail on both models, on
`typical-result-beside-each-result`. The page puts 41% in its H1 and gives the typical figures in
the intro paragraph directly below it, and again beside the quote under its own heading. Both
models still fail it. In practice the gate arms may block a compliant customer story whose
headline carries the customer's number. An agent can get past it by also stating the typical
figure beside each mention of the result, or by keeping the number out of the heading. There were
no refusals and no errors in any round. All five proof folders I made are deleted. (The other
`prove-*` folders under /tmp/agentests-benchmark belong to other workers.)

## Research and triage notes

- The research `near_miss.compliant` says "Most Kilowatch customers save between 3% and 10%". The
  research fixture's data gives no 3% lower bound, so I did not use that wording. The rubric and
  A2 treat a typical range the data does not give as a breach.
- The research marks the rule `cross-file` (outcomes data in a second file). The triage's
  `restate-policy` resolves this: the two figures are written into the rule and into A2, so one
  file is enough to judge.
- The rule's "the same page clearly states" is narrowed by its standing policy to "in the main copy
  beside the result" and "each piece ... carries its own statement". The skill and the rubric read
  "beside" as the same section, ad or slide, and the Test reads it as the same heading's section.

## Not verified

- No agent was run. Whether the agent in the skill arm loads this skill next to nine others is not
  known.
- The decision scores themselves cannot be seen. Only outcomes and the failing assertion ids show
  in `output.log`, so the round-to-round changes were inferred from those.
- Luna's result on careful-facebook-ads changed between rounds 3, 4 and 5 (pass, fail, pass), so
  it may be near the threshold.
