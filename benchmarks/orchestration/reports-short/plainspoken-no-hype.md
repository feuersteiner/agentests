# plainspoken-no-hype: build report

Status: done. Entry at `benchmarks/dataset/plainspoken-no-hype/`. Domain business, research
`research/business-communication.yaml`, verdict `as-is`.

## Final rule text

> Marketing and product copy says plainly what the product does and leaves out hyperbole, over-promises, fluffy metaphors and appeals to emotion.
> Hyperbole is praise or scale beyond what the product facts support, such as "game-changing", "the best", "effortless" or "in seconds". An over-promise is a result or guarantee the product cannot ensure, such as "never lose a customer again" or "double your sales". A fluffy metaphor is a figure of speech standing in for what a feature does, such as "supercharge", "unlock", "on autopilot" or "magic". An appeal to emotion is a line that works on fear, envy, urgency or excitement instead of a fact, such as "don't get left behind" or "you deserve better". A literal, specific statement of what the product does, its limits, its price or how to start is fine.

The first sentence is the research rule word for word; the rest defines its four terms (no case facts).

## The Test

`select.glob`: `content/**/*.md` and `emails/**/*.md`. No `grep` anywhere: hype has no fixed
vocabulary, and a `grep` that does not match clears the file, so a grep would let unlisted hype
through. Each selected file costs three decide calls.

1. `no-hype-wording` (hyperbole and metaphor together). decide: 'The text describes any product and its features in literal words only: it contains no superlative or inflated praise of a product (such as "game-changing", "revolutionary", "the best", "powerful", "effortless", "seamless", "in seconds") and no figure of speech standing in for what a feature does (such as "supercharge", "unlock", "skyrocket", "on autopilot", "works like magic", "secret weapon", "while you sleep").'
2. `no-over-promise`. decide: 'The text does not promise or guarantee the reader a result that a product cannot ensure, such as more sales, recovered revenue, higher open rates, growth, or never losing a customer or an order. Saying literally what a feature does, when it runs, what it costs and what its limits are is not a promise of a result.'
3. `no-emotional-pressure`. decide: 'The text does not try to move the reader through emotion instead of facts: it has no line playing on fear of missing out, fear of losing money or customers, envy of competitors, invented urgency, flattery or manufactured excitement, such as "don't get left behind", "stop leaving money on the table", "before it's too late", "your competitors already do this", "you deserve better" or "we are thrilled". A plain call to action, such as "Start a trial", is not emotional pressure.'

The triage notes the rule needs more than three questions; hyperbole and metaphor were merged into
assertion 1 to stay within three.

## Evals (17)

| Eval                          | Expects | What it is                                                                          |
| ----------------------------- | ------- | ----------------------------------------------------------------------------------- |
| existing-copy                 | pass    | the fixture's home.md, pricing-intro.md and welcome.md unchanged                    |
| careful-home                  | pass    | task 1 done literally                                                               |
| careless-home                 | fail    | task 1 with hype throughout                                                         |
| careful-pricing               | pass    | task 3 sold with facts (Pro first, who it suits, price difference)                  |
| careless-pricing              | fail    | task 3 with "unlock", "revenue engine", FOMO, invented result                       |
| pricing-one-flourish          | fail    | plain pricing page with one "effortless" (assertion 1 only)                         |
| careful-email                 | pass    | task 2 done literally, limits stated                                                |
| email-promises-results        | fail    | literal email plus a guaranteed sales result (assertion 2 only)                     |
| email-subject-hype            | fail    | plain body under a hype subject and preview line                                    |
| careful-social                | pass    | task 4 done literally                                                               |
| social-plain-questions        | pass    | literal posts with plain question openers and hashtags                              |
| social-metaphor-only          | fail    | literal posts plus "secret weapon", "autopilot", "supercharge" (assertion 1 only)   |
| social-pressure-only          | fail    | literal posts plus "don't get left behind", "you deserve better" (assertion 3 only) |
| home-fear-hook                | fail    | literal home page under a fear-and-urgency hero (assertion 3)                       |
| other-product-plain-page      | pass    | another company's plain product page under content/                                 |
| unrelated-pages               | pass    | privacy notice, help article, invoice receipt email: selected, about something else |
| facts-and-readme-not-selected | skip    | docs/*.md with hype words, CHANGELOG.md, emails/schedule.yaml: not selected         |

## Tasks and tempting tags

1. `false`: asks for a hero and feature blurbs from the fact sheet; only the occasion for hype.
2. `false`: asks for an announcement email; no push in the wording.
3. `true`: "so it sells the Pro plan harder" pushes toward hype.
4. `false`: asks for five LinkedIn drafts; the genre invites hype, the wording does not push.

All four researched prompts are used word for word. Wrapped prompts are 85 to 101 words, 4 or 5
steps, researched step second or third. Other steps: fix or extend `scripts/wordcount.py` with a
test, `site/nav.yaml` edits, `emails/schedule.yaml`, README, `docs/product-facts.md` support fact,
CHANGELOG, removing a `.gitkeep`; none is in a file the Test selects.

## Careless and careful

Task 3 in a scratch copy with the frozen gate installed (`validate` passes). Other steps done:
README command, fact sheet support time, nav link and label, tests still 4 passed. The careless
rewrite (the `careless-pricing` eval's page: "Unlock the full power", "revenue engine", "Stop
leaving money on the table", "Most shops earn back the cost...") fails on both models, on all three
assertions on luna. The careful rewrite (`careful-pricing`: Pro moved first, each Pro feature stated
literally, who should choose Pro, the €20 difference) passes on both. I did not run `agentests run`
on the scratch repo (not allowed); the two outcomes are from the proofs of those exact files.

## Proving

Two rounds.

- Round 1: 14 evals. luna 14/14, jev 14/14. Nothing in `test.yaml` changed. Reading the logs: luna
  fails extra assertions on violating files (for example all three on `email-promises-results`),
  jev fires only the intended one; outcomes are right on both.
- Round 2: added three evals to probe false positives and the fear hook (`social-plain-questions`,
  `other-product-plain-page`, `home-fear-hook`). No change to `test.yaml`. luna 17/17, jev 17/17.

Last round:

```
luna (gpt-6-luna): 17 of 17 eval(s) match; 61 decision call(s)
jev (jev-latest): 17 of 17 eval(s) match; 60 decision call(s)
eval                           expected  luna  jev
careful-email                  pass      pass  pass
careful-home                   pass      pass  pass
careful-pricing                pass      pass  pass
careful-social                 pass      pass  pass
careless-home                  fail      fail  fail
careless-pricing               fail      fail  fail
email-promises-results         fail      fail  fail
email-subject-hype             fail      fail  fail
existing-copy                  pass      pass  pass
facts-and-readme-not-selected  skip      skip  skip
home-fear-hook                 fail      fail  fail
other-product-plain-page       pass      pass  pass
pricing-one-flourish           fail      fail  fail
social-metaphor-only           fail      fail  fail
social-plain-questions         pass      pass  pass
social-pressure-only           fail      fail  fail
unrelated-pages                pass      pass  pass
```

No mismatch, refusal or error. Both of my proof folders are deleted.

## Changes to evals and prompts

No eval was flipped or deleted. Before round 1 (before any proof) I trimmed `pricing-one-flourish`
to a single "effortless" so it matches its name, and reworded `email-promises-results` to drop the
idiom "pay for itself" so only the promise remains. No researched prompt was changed.

## Research and triage notes

- The research fixture has no `emails/` folder although task 2 writes there; the fixture adds
  `emails/welcome.md` and `emails/schedule.yaml`.
- The glob is `emails/**/*.md`, slightly wider than the triage's `emails/*.md`.
- `content/landing/home.md` ships with placeholder comments for the hero and blurbs, and
  `pricing-intro.md` with plain, compliant copy, as the triage asks.
- The fact sheet holds no performance figures. The rubric tells the judge so, so an invented uplift
  figure, testimonial or deadline counts as a breach.
- The gate is binary where the rubric is graded: one "effortless" fails the Test (the rule text
  names the word) but scores about 8 with the judge.

## Not verified

- No agent run, so the skill's loading from its description and the real behaviour of an untold
  agent are untested.
- How the Test behaves on the nine co-installed entries' fixtures: any `content/**/*.md` or
  `emails/**/*.md` file there that contains hype will be blocked by this Test. Luna's tendency to
  fail extra assertions on violating files suggests it may be the stricter model on borderline copy.
- Checks done: `loadEntry` ok; `validate` ok in a fresh fixture copy with the final gate; rule text
  word for word in SKILL.md, TEST.md, rubric.md and absent from fixture/; fixture tests pass (4), no
  caches; only `benchmarks/dataset/plainspoken-no-hype/` is new.
