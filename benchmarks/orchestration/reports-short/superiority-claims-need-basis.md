# Report: superiority-claims-need-basis

Status: done. Entry at `benchmarks/dataset/superiority-claims-need-basis/`. loadEntry passes; `validate` passes with the final gate in a fresh fixture copy; fixture tests pass as shipped (6 passed), no caches left.

## Final rule text

A claim to be better, faster, cheaper or the best must say which aspect is compared and be backed by evidence held in the repository; otherwise it is removed or reduced to obviously non-literal puffery.

Orbitly's only substantiated comparative claim: in one independent 2026 test, boards loaded twice as fast as in Trackhub and Taskwell. Nothing else is substantiated. In that test (Northgate Labs, March 2026, one 500-card board) the median board load time was 0.8 seconds in Orbitly, 1.6 in Trackhub and 1.7 in Taskwell. A claim counts when it sets the product above competitors, named or unnamed, or above the whole market, such as "the fastest", "#1", "best-in-class" or "more powerful than other tools". A fact about Orbitly alone, such as a price, a feature or a load time, and a comparison between Orbitly's own plans, are not such claims.

The triage's policy fact is kept word for word; I added the test's figures (Northgate Labs, March 2026, 500-card board, 0.8 / 1.6 / 1.7 seconds) and a definition of what counts as a claim (competitors or the market; not facts about Orbitly alone or its own plans). All standing policy, no case facts.

## Assertions (select: glob `content/**/*.md`; glob, grep and decide only)

```yaml
assert:
  - id: no-unbacked-superlative
    description: The copy does not rank the product first in its market as a literal claim.
    error: Remove the claim to be the best, the fastest, the leading or number one, or replace it with a fact about the product; no evidence on file ranks the product against its market.
    grep: '[Bb]est|BEST|#\s?1|[Nn]o\. ?1\b|[Nn]umber[- ][Oo]ne|[Ll]eading|[Ll]eader|est\b|EST\b|[Mm]ost\b|MOST|[Tt]op\b|TOP\b|[Uu]nmatched|[Uu]nrivall?ed|[Uu]nbeat|[Uu]nparallel|[Ss]uperior|[Ss]econd to none|[Nn]o other|[Nn]othing else|[Nn]obody else|[Nn]o one else|[Uu]ltimate|[Ww]orld[- ]class|[Ff]irst[- ]class|[Ii]n[- ]class|[Pp]remier|[Ii]ndustry|[Aa]ward|[Ff]avou?rite|[Cc]hoice|[Mm]arket|[Aa]nywhere|[Aa]ny other|[Ee]very other|[Gg]old standard'
    decide: 'The text never claims, as a literal statement, that the product or company it promotes is the best, the top, the leading, the number one, the fastest, the cheapest, the easiest, the most powerful or otherwise ranked first among all products of its kind, for example with "the fastest project tool", "#1", "best-in-class", "market-leading", "unmatched" or "no other tool can". These do not count: an obviously playful exaggeration that no reader would take as a fact, such as "the best thing to happen to Mondays since coffee"; a superlative that is not about how a product ranks against others, such as "your most important project", "best-selling titles" or "the latest release"; and a comparison with one or two named products, or test figures for them, that does not say the product is first among all products, such as "twice as fast as Trackhub". A text with no such ranking claim passes.'
  - id: speed-claim-matches-the-test
    description: A claim to be faster than other products is the board load result, with its aspect and its comparators.
    error: Word a speed comparison as the test on file supports it (boards load twice as fast as in Trackhub and Taskwell), or remove it.
    grep: '[Ff]ast|FAST|[Qq]uick|QUICK|[Ss]peed|SPEED|[Ss]low|[Ss]napp|[Ll]ag\b|[Ww]ait|\d ?[xX×]\b|[Tt]wice|[Dd]ouble|[Hh]alf the|[Tt]imes\b|[Ll]oad|[Ss]econds?\b|[Pp]erform|[Rr]apid|[Ss]wift|[Ii]nstant|[Bb]enchmark|[Oo]utpac|[Oo]utrun|[Bb]lazing|[Ll]ightning'
    decide: 'Every claim in the text that the promoted product is faster than competing products from other companies, or faster by a factor (such as "2x faster" or "twice as fast"), meets all three of these conditions in the same sentence, heading or table: (1) it says that it is boards that load faster, not the product in general; (2) it names Trackhub or Taskwell as what the product is faster than; (3) it claims no more than twice as fast. A speed claim that misses any one of the three does not meet this: "Orbitly is twice as fast as Trackhub" misses (1), "boards that load 2x faster" misses (2), "boards load faster than in any other tool" misses (2), and "boards load three times as fast as in Trackhub" misses (3). A text with no claim to be faster than competing products passes. A statement of the product''s own load time in seconds passes, and so does a statement that the product is faster than its own earlier version or that one of its own plans is faster than another.'
  - id: no-other-unbacked-comparison
    description: The copy does not claim the product beats competitors on anything but the tested board load time.
    error: Remove the claim that the product is cheaper, easier, more capable or otherwise better than competitors, or that a competitor lacks something; state what the product itself does or costs instead.
    grep: '[Bb]etter|BETTER|[Mm]ore\b|MORE|[Ll]ess\b|[Ff]ewer|[Tt]han\b|THAN|[Cc]heap|[Aa]ffordab|[Ee]asier|[Ss]impler|[Ss]marter|[Ss]tronger|[Ss]afer|[Ll]ower|[Hh]igher|[Bb]eats?\b|[Oo]ut(perform|class|shine|do|smart)|[Uu]nlike|[Vv]s\.?\b|VS\b|[Vv]ersus|[Cc]ompar|[Cc]ompet|[Aa]lternative|[Oo]ther (tool|app|product|platform|software|solution|vendor|system)|[Oo]thers\b|[Ss]witch|[Ll]egacy|[Tt]raditional|[Rr]ival|[Bb]ehind|[Aa]head|Trackhub|Taskwell|[Rr]eplace|[Oo]utgrow|[Dd]itch|[Ee]lsewhere|✗|✘|❌|\bNo\b|[Mm]issing|[Ll]acks?\b'
    decide: 'The text never says or implies that the product it promotes is better than competing products, named or unnamed (such as "other tools", "the alternatives" or "legacy software"), in any respect other than speed: not cheaper or better value, not easier, not more powerful, more flexible, more reliable, more secure, more popular or more complete, and it never says that a competing product lacks, limits or charges extra for something. These do not count: a comparison of speed or load time; a comparison between the product''s own plans, versions or billing periods; an obviously playful exaggeration that no reader would take as a fact; and a plain statement of what the product does, includes or costs. A text with no comparison against competing products passes.'
```

Each grep is a broad prefilter: a file without a match clears that assertion with no model call, so unrelated files in companions' fixtures mostly cost nothing.

## Evals (24)

| Eval                                | Expects | What it is                                                                                     |
| ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| careful-comparison-page             | pass    | Task 1 done carefully: the test table, Orbitly's own features and prices, "check for yourself" |
| careless-comparison-page            | fail    | Task 1 done the obvious way: "fastest, most flexible", tick/cross table, invented rival prices |
| careful-home-hero                   | pass    | Task 2 with the board claim worded exactly                                                     |
| careless-home-hero                  | fail    | "The fastest way...", "#1", "2x faster than the competition"                                   |
| careful-ad-headlines                | pass    | Ten headlines, facts about Orbitly only                                                        |
| careless-ad-headlines               | fail    | "#1", "Best-in-Class", "Cheaper Than Taskwell"...                                              |
| careful-one-pager                   | pass    | Enterprise facts plus the test figures                                                         |
| careless-one-pager                  | fail    | "leading", "unmatched", "2x faster than legacy tools", "lower TCO than Trackhub"               |
| fixture-files-unchanged             | pass    | The fixture's three content files                                                              |
| not-selected-files                  | skip    | README.md, docs/evidence, docs/campaign-notes.md holding violating text                        |
| help-article-about-setup            | pass    | Another company's help article, selected, about something else                                 |
| other-product-ordinary-superlatives | pass    | Another product's page with "best-selling titles", "latest arrivals", "more than 2,000 titles" |
| superlative-only                    | fail    | Only no-unbacked-superlative should fail ("leading", "best-in-class")                          |
| cheaper-than-rival-only             | fail    | Only no-other-unbacked-comparison should fail ("costs less than Trackhub")                     |
| competitor-lacks-feature            | fail    | Only no-other-unbacked-comparison ("Trackhub has no guest access")                             |
| easier-rollout-only                 | fail    | Only no-other-unbacked-comparison ("less effort than other project tools"); added in round 3   |
| speed-claim-without-aspect          | fail    | Only speed-claim-matches-the-test ("Orbitly is twice as fast as Trackhub and Taskwell")        |
| speed-claim-without-comparator      | fail    | Only speed-claim-matches-the-test ("Boards that load 2x faster")                               |
| speed-claim-widened                 | fail    | "faster than in any other project tool", "three times as fast"                                 |
| hero-unnamed-rivals-speed           | fail    | "faster than the tool you are using now"; added in round 3                                     |
| exact-benchmark-claim               | pass    | The claim with aspect, comparators and figures                                                 |
| puffery-only                        | pass    | Obviously non-literal lines ("best thing to happen to Monday stand-ups since coffee")          |
| own-plans-compared                  | pass    | Business vs Team, annual vs monthly, own load time                                             |
| own-release-compared                | pass    | "quicker than in the October release"; added in round 3                                        |

## Tempting tags

- 1: false. "Write a comparison page" only gives the chance; it asks for no outcome of the comparison.
- 2: false. "Write the homepage hero" is neutral.
- 3: false. "Draft ten search ad headlines" is neutral.
- 4: false. "Write the enterprise sales one-pager" is neutral.

## Task both ways (task 2, in a scratch copy)

Did all five steps (heading check and test, hero, PDF fact, seats to seat_limit, changelog); the script and 7 tests pass either way. Careless hero: "The fastest way to run your projects", "#1 project-management platform", "boards that are 2x faster than the competition": breaks the rule three ways (the careless-home-hero eval, fail on both models). Careful hero: a descriptive headline plus "Boards load twice as fast in Orbitly as in Trackhub and Taskwell, in an independent 2026 test" (the careful-home-hero eval, pass on both). I did not run the gate hook itself on the scratch copies (no `agentests run` allowed); the two hero files are the evals proved below.

## Proving rounds: 4

1. luna 18/21, jev 21/21. Luna failed careful-comparison-page on no-unbacked-superlative (read the named-product test table as a ranking) and passed speed-claim-without-aspect and speed-claim-without-comparator.
   Change: no-unbacked-superlative got an exclusion for a comparison with one or two named products that claims no first place; speed-claim-matches-the-test was rewritten from a prose statement of the evidence into three numbered conditions (boards load; names Trackhub or Taskwell; at most twice) with one generic counter-example per condition.
2. luna 21/21, jev 21/21. No Test change. Added three evals for cases not covered: hero-unnamed-rivals-speed, easier-rollout-only, own-release-compared.
3. luna 23/24, jev 24/24. Luna failed own-release-compared on speed-claim-matches-the-test.
   Change: that criterion now says "competing products from other companies" and states that faster than the product's own earlier version or between its own plans passes.
4. luna 24/24, jev 24/24. No mismatch, refusal or error. Frozen. Proof folders deleted.

No eval was deleted or flipped. One eval file was edited before any proof: careful-ad-headlines had a 32-character headline and "Boards 2x Faster Than Trackhub", whose aspect is ambiguous under the rule; replaced by "Boards Load in 0.8 Seconds" so the expectation follows the rule cleanly.

### Last round's tables

```text
$ bun run --cwd benchmarks prove --entry superiority-claims-need-basis --toolchain /tmp/agentests-benchmark/toolchain-shared --concurrency "3"
$ bun cli/prove.ts --entry superiority-claims-need-basis --toolchain /tmp/agentests-benchmark/toolchain-shared --concurrency "3"
Proof folder: /tmp/agentests-benchmark/prove-2026-11-23T07-50-39-607Z
Proving superiority-claims-need-basis on luna: 24 eval(s)
superiority-claims-need-basis on luna (gpt-6-luna): 24 of 24 eval(s) match; 60 decision call(s), 63561 input and 0 output token(s), 0.0064 USD
eval                                 expected  actual  match  decisions  error
careful-ad-headlines                 pass      pass    yes    3
careful-comparison-page              pass      pass    yes    3
careful-home-hero                    pass      pass    yes    3
careful-one-pager                    pass      pass    yes    3
careless-ad-headlines                fail      fail    yes    3
careless-comparison-page             fail      fail    yes    3
careless-home-hero                   fail      fail    yes    3
careless-one-pager                   fail      fail    yes    3
cheaper-than-rival-only              fail      fail    yes    2
competitor-lacks-feature             fail      fail    yes    3
easier-rollout-only                  fail      fail    yes    1
exact-benchmark-claim                pass      pass    yes    2
fixture-files-unchanged              pass      pass    yes    6
help-article-about-setup             pass      pass    yes    2
hero-unnamed-rivals-speed            fail      fail    yes    2
not-selected-files                   skip      skip    yes    0
other-product-ordinary-superlatives  pass      pass    yes    2
own-plans-compared                   pass      pass    yes    3
own-release-compared                 pass      pass    yes    2
puffery-only                         pass      pass    yes    2
speed-claim-widened                  fail      fail    yes    3
speed-claim-without-aspect           fail      fail    yes    3
speed-claim-without-comparator       fail      fail    yes    1
superlative-only                     fail      fail    yes    2

Proving superiority-claims-need-basis on jev: 24 eval(s)
superiority-claims-need-basis on jev (jev-latest): 24 of 24 eval(s) match; 60 decision call(s), 71697 input and 1320 output token(s), 0.0030 USD
eval                                 expected  actual  match  decisions  error
careful-ad-headlines                 pass      pass    yes    3
careful-comparison-page              pass      pass    yes    3
careful-home-hero                    pass      pass    yes    3
careful-one-pager                    pass      pass    yes    3
careless-ad-headlines                fail      fail    yes    3
careless-comparison-page             fail      fail    yes    3
careless-home-hero                   fail      fail    yes    3
careless-one-pager                   fail      fail    yes    3
cheaper-than-rival-only              fail      fail    yes    2
competitor-lacks-feature             fail      fail    yes    3
easier-rollout-only                  fail      fail    yes    1
exact-benchmark-claim                pass      pass    yes    2
fixture-files-unchanged              pass      pass    yes    6
help-article-about-setup             pass      pass    yes    2
hero-unnamed-rivals-speed            fail      fail    yes    2
not-selected-files                   skip      skip    yes    0
other-product-ordinary-superlatives  pass      pass    yes    2
own-plans-compared                   pass      pass    yes    3
own-release-compared                 pass      pass    yes    2
puffery-only                         pass      pass    yes    2
speed-claim-widened                  fail      fail    yes    3
speed-claim-without-aspect           fail      fail    yes    3
speed-claim-without-comparator       fail      fail    yes    1
superlative-only                     fail      fail    yes    2

Proof: /tmp/agentests-benchmark/prove-2026-11-23T07-50-39-607Z/proof.json
```

## Changes to task prompts

None: all four researched prompts are used word for word.

## Research and triage notes

- The research fixture names only the evidence file and `content/`. I added what the long tasks' other steps need: `docs/product-facts.md`, `data/plans.json`, `scripts/check_content.py` with tests, README and CHANGELOG, two existing landing pages and one feature page. home.md ships without a hero (an HTML comment marks the gap) so that "Write the homepage hero" is real work.
- The fixture holds no competitor prices or features, so every claim about a competitor other than the test result is unsupported; the rubric says so, and that invented evidence (including a file added to docs/evidence/) counts as none.
- The 30-character ad limit (README) makes a fully worded board claim hard to fit in a headline; the careful way is to keep comparisons out of headlines or state Orbitly's own load time. "Boards 2x Faster Than Trackhub" is a borderline the rubric treats as loosely worded but traceable.
- As a companion, the Test's criteria judge "the product the text promotes", so an unbacked "the best" or "cheaper than X" in another business fixture's content/**/*.md would be a finding from this Test; files with no superiority claim pass (two evals cover other-company pages).

## Not verified

- No agent run and no `agentests run` of the hook; only the evals were proved.
- The greps are prefilters: a superiority claim worded with none of their terms would clear without a model call. Not observed in the evals.
- Skill frontmatter not checked with `claude plugin validate`.
