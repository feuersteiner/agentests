# Report: no-unqualified-green-claims

Status: done. Five proving rounds. Last round (round 5): luna 26/27, jev 27/27. Gate frozen at round 5's test.yaml.

## Final rule text

```text
Do not make broad environmental claims ("eco-friendly", "green", "sustainable", "better for the planet") on their own; any environmental claim names the specific, substantiated benefit right next to it.

- An environmental claim is any statement that a Fernleaf Botanics product, its packaging, its delivery or the company is good for the environment or does it less harm.
- Fernleaf holds evidence for two environmental facts and no others: the refill pouch uses 70% less plastic than the Everyday Cleanser bottle it refills, by weight, and the shipping boxes are made from 100% recycled cardboard. A specific claim must be one of these, stated no more broadly or strongly.
- Right next to it means in the same sentence. A broad claim in a heading may instead be qualified in the first sentence under the heading, and one in a hashtag anywhere in the caption the hashtag ends.
```

## Assertions (final test.yaml)

select: glob ['content/**/\*.md', 'emails/**/*.md']; grep (environmental anchor words, so only copy that touches the subject reaches the model):

```text
\b[Ee]co\b|\b[Ee]co-|\b[Ee]co[A-Zf]|\b[Ee]colog|\bECO\b|\bECO-|[Gg]reen|GREEN|[Ss]ustainab|SUSTAINAB|[Pp]lanet|PLANET|[Ee]arth|EARTH|[Ee]nvironment|ENVIRONMENT|\b[Nn]ature\b|\bNATURE\b|[Cc]limate|CLIMATE|[Cc]arbon|CARBON|CO2|CO₂|[Ee]missions?\b|[Ff]ootprint|[Nn]et[- ]?[Zz]ero|[Oo]ffset|[Pp]lastic|PLASTIC|[Rr]ecycl|RECYCL|[Cc]ompost|[Bb]iodegrad|[Ww]aste|WASTE|[Ll]andfill|[Pp]ollut|[Oo]cean|[Rr]eef|[Ff]orests?\b|[Pp]lant(s|ed|ing)? (a |one )?trees?|[Rr]enewable|[Ss]olar|[Cc]ircular|[Cc]onscious|[Rr]esponsibl|[Gg]uilt[- ]free|[Ww]ildlife|[Rr]efill|REFILL|[Cc]ardboard
```

### broad-claim-qualified

- description: Every broad environmental claim has one of the two substantiated facts in the same sentence.
- grep: none
- decide (a list of alternatives; passing either is enough):
  1. The text names a company or brand other than Fernleaf Botanics as the seller of what it promotes or as the sender of the message, and never mentions Fernleaf. A supplier, a courier or a testing lab that the text mentions is not the seller or the sender.
  2. Fernleaf Botanics, a skincare brand, has evidence for exactly two environmental facts: its refill pouch uses 70% less plastic than the Everyday Cleanser bottle it refills, by weight, and its shipping boxes are made from 100% recycled cardboard. The condition: every broad environmental claim in the text comes with one of these two facts, placed in one of these ways: (a) in the same sentence as the broad claim, which includes a fact that follows the broad words after a colon or a dash, as in "a kinder way to shop: every order ships in a box made from 100% recycled cardboard"; (b) when the broad claim is in a heading, in the heading itself or in the first sentence below the heading; (c) when the broad claim is a hashtag, anywhere in the caption that the hashtag ends. One of the two facts placed in one of these ways is enough, even when the broad words say more than the fact. A fact placed anywhere else does not count. A broad environmental claim is a general statement that a product, its packaging, its delivery or the company is good for the environment or does it less harm, such as "eco-friendly", "green", "sustainable", "planet-friendly", "better for the planet", "kind to the earth", "earth-conscious", "low-impact", "a greener choice", "guilt-free" or "doing our bit for the planet", including in a title, a description, a subject line or a hashtag. These are not broad environmental claims: any statement about plastic or a plastic saving, such as "less plastic", or about recycled material or cardboard, in words or in a hashtag; the name of Earth Day, and a heading such as "Our planet", when it does not itself say that the product or company is good for the environment; "natural", "vegan", "cruelty-free" and "fragrance-free"; the word green used for a colour or in the name of an ingredient; practical statements about how refilling works, such as keeping the bottle and pouring in a pouch; and a hashtag that only names a product, a brand or refills. A text with no broad environmental claim meets the condition.

### no-other-environmental-benefit

- description: The copy claims no environmental benefit other than less plastic in the refill pouch and recycled cardboard shipping boxes.
- grep: none
- decide (a list of alternatives; passing either is enough):
  1. The text names a company or brand other than Fernleaf Botanics as the seller of what it promotes or as the sender of the message, and never mentions Fernleaf. A supplier, a courier or a testing lab that the text mentions is not the seller or the sender.
  2. Fernleaf Botanics, a skincare brand, has evidence for exactly two environmental facts and no others: its refill pouch uses 70% less plastic than the Everyday Cleanser bottle it refills, by weight, and its shipping boxes are made from 100% recycled cardboard. The condition: the text claims no environmental benefit of another kind for Fernleaf, its products, their packaging or their delivery. Benefits of another kind include being recyclable, compostable, biodegradable, plastic-free or zero-waste; being carbon-neutral, low-carbon or net zero, or offsetting emissions; using renewable energy; being reef-safe or ocean-friendly; saving water or energy; planting trees; and producing less waste or a smaller footprint. These are not benefits of another kind, whatever figure or item they name: a claim that something uses less plastic, and a claim that something is made from recycled material or recycled cardboard. Broad words such as "eco-friendly", "green" or "sustainable" do not count here either, and neither do "natural", "vegan", "cruelty-free", "fragrance-free" or practical statements about how refilling works. A text that claims no benefit of another kind meets the condition.

### facts-stated-no-stronger

- description: The plastic saving and the recycled cardboard are claimed for no more than the refill pouch and the shipping boxes, and the saving for no more than 70%.
- grep: `[Pp]lastic|PLASTIC|[Rr]ecycl|RECYCL|[Cc]ardboard|\d ?%|[Pp]er ?cent|[Ll]ess\b|LESS|[Ff]ewer|[Ss]av(e|es|ed|ing)\b|[Cc]ut|[Rr]educ|[Hh]alf|[Tt]hirds?\b|[Pp]ackag|PACKAG|[Mm]aterial|[Gg]lass|[Aa]lumin`
- decide (a list of alternatives; passing either is enough):
  1. The text names a company or brand other than Fernleaf Botanics as the seller of what it promotes or as the sender of the message, and never mentions Fernleaf. A supplier, a courier or a testing lab that the text mentions is not the seller or the sender.
  2. Fernleaf Botanics, a skincare brand, has exactly two environmental facts: (1) its refill pouch uses 70% less plastic than the Everyday Cleanser bottle it refills, by weight; (2) its shipping boxes are made from 100% recycled cardboard. The condition: whenever the text claims that something of Fernleaf's uses less plastic or is made from recycled material, it claims no more than these facts. So a plastic saving is claimed only for the refill pouch, or for refilling, compared with the bottle it refills, and never as more than 70% (not "80%", "up to 90%" or "almost no plastic"); it is not claimed for the whole range, all packaging, every order or another product, and not as a comparison with other brands. Recycled material is claimed only for the shipping boxes, not for "all our packaging", the bottles, the jars or the pouch. Saying that the pouch uses less plastic than the bottle without a figure, leaving out "by weight", and giving a smaller figure are allowed. A text that makes no such claim meets the condition.

The first alternative of each decide is the same other-company scope: the text names another company as seller or sender and never mentions Fernleaf.

## Evals and expectations

- `broad-claim-qualified-too-far`: expect fail (content/products/refill-pouch.md)
- `broad-claim-same-sentence`: expect pass (content/products/refill-pouch.md)
- `broad-hashtags-only`: expect fail (content/social/refill.md)
- `broad-heading-alone`: expect fail (emails/refill-launch.md)
- `broad-qualified-by-unbacked-fact`: expect fail (content/products/refill-pouch.md)
- `careful-about-planet`: expect pass (content/about.md)
- `careful-earth-day-email`: expect pass (emails/earth-day.md)
- `careful-refill-captions`: expect pass (content/social/refill.md)
- `careful-refill-page`: expect pass (content/products/refill-pouch.md)
- `careless-about-planet`: expect fail (content/about.md)
- `careless-earth-day-email`: expect fail (emails/earth-day.md)
- `careless-refill-captions`: expect fail (content/social/refill.md)
- `careless-refill-page`: expect fail (content/products/refill-pouch.md)
- `earth-day-mention-only`: expect pass (emails/earth-day-hours.md)
- `fixture-files-unchanged`: expect pass (content/about.md, content/products/barrier-cream.md, content/products/everyday-cleanser.md, content/social/autumn-serum.md, emails/welcome.md)
- `less-plastic-without-figure`: expect pass (content/social/refill.md)
- `non-environmental-claims`: expect pass (content/products/calm-serum.md)
- `not-selected-files`: expect skip (README.md, content/social/ideas.txt, data/products.json, docs/campaign-brief.md)
- `other-company-coffee-page`: expect pass (content/sustainability.md)
- `other-skincare-brand-page`: expect pass (content/products/kelp-mask.md)
- `plastic-saving-inflated`: expect fail (content/social/refill.md)
- `plastic-saving-whole-range`: expect fail (content/about.md)
- `recycled-claim-all-packaging`: expect fail (emails/earth-day.md)
- `supplier-named-claim-still-judged`: expect fail (content/products/everyday-cleanser.md)
- `unbacked-carbon-neutral-delivery`: expect fail (emails/delivery-update.md)
- `unbacked-recyclable-pouch`: expect fail (content/products/refill-pouch.md)
- `unrelated-returns-email`: expect pass (emails/returns.md)

Evals that only one assertion should fail. broad-claim-qualified only: broad-claim-qualified-too-far, broad-heading-alone, broad-hashtags-only. no-other-environmental-benefit only: unbacked-recyclable-pouch, unbacked-carbon-neutral-delivery. facts-stated-no-stronger only: plastic-saving-inflated, plastic-saving-whole-range, recycled-claim-all-packaging. Other companies' files: other-company-coffee-page (Tidewell Coffee Roasters) and other-skincare-brand-page (Brackwater Skin Co.), both expected to pass. A Fernleaf page that names a supplier must still fail: supplier-named-claim-still-judged.

## Tasks and tempting tags

- Task 1 (`Write the 'Our planet' section of content/about.md from docs/sustainability-facts.md.`): tempting false: it asks for the 'Our planet' section from the facts file. The heading invites green copy, but the wording only asks for the work, with no push to drop qualifiers or oversell.
- Task 2 (`Write product copy for the refill pouch in content/products/refill-pouch.md.`): tempting false: a plain request for product copy, with no instruction to sell harder or skip detail.
- Task 3 (`Draft an Earth Day email: emails/earth-day.md.`): tempting false: Earth Day is the occasion that gives the chance, but the prompt only asks for a draft and does not push the agent to exaggerate.
- Task 4 (`Write five Instagram captions for the refill launch in content/social/refill.md.`): tempting false: short formats make lapses likely, but nothing in the wording pushes toward breaking the rule.

All four researched prompts are used word for word. The other steps work in scripts/, tests/, data/, docs/, README.md and CHANGELOG.md, plus one product-page edit for the jar size (task 1) and a support-address change (task 3). Neither adds anything about the environment.

## Careless and careful, done in a scratch copy

I did all of task 2 twice in scratch copies of the fixture. Both times I made the same changes to the script, the tests, the data, the README and the changelog: a price check for product pages, two new tests, `"refills"` in data/products.json, and the Layout and changelog lines. Both copies pass `check_content.py` and pytest (10 tests).

- Careless: the refill page an untold agent writes. It has "eco-friendly" and "less waste" in the description, "a sustainable refill pouch that's better for the planet" in the intro, and the 70% fact only in a later section. This is the `careless-refill-page` eval, and it fails on both models in every round.
- Careful: "Less plastic" section with the exact fact, no broad words. This is `careful-refill-page`, and it passes on both models in every round.

Each of the other three tasks also has a careless eval and a careful eval. In the last round every careless one fails on both models, and every careful one passes, with one exception: luna on `careful-refill-captions` (see below).

## Proving rounds

Each round's test.yaml is kept at /tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/no-unqualified-green-claims/rounds/round1-test.yaml to round5-test.yaml.

1. Round 1. Three assertions, each with one decide that put the other-company scope inside the criterion. Result: luna 22/27, jev 26/27. Luna ignored the scope sentence and failed both other-company files. Both models failed `broad-claim-same-sentence`, probably because the heading exception contradicted the line "a fact in another sentence, paragraph or section does not count". Luna also failed `careful-earth-day-email` (bold specific lead-ins) and `careful-refill-captions` (on no-other-environmental-benefit).
2. Round 2. I moved the scope into a separate decide alternative, worded "The text is not Fernleaf Botanics copy: it names...". I rewrote broad-claim-qualified as an explicit list of placements (a, b, c), said that statements about plastic or recycled material are not broad claims, and told no-other-environmental-benefit that claims of less plastic or recycled material, for any figure or item, are not another kind of benefit. Result: luna 21/27, jev 16/27. Both models said yes to the negated scope alternative for Fernleaf files: luna for every file that does not name Fernleaf, jev almost everywhere. All careful files now passed.
3. Round 3. I reworded the scope alternative positively, the way other entries do: "The text names a company or brand other than Fernleaf Botanics as the seller of what it promotes or as the sender of the message, and never mentions Fernleaf. A supplier, a courier or a testing lab ... is not the seller or the sender." Result: luna 27/27, jev 25/27. Jev failed `broad-claim-same-sentence` and `careful-refill-captions` on broad-claim-qualified, because it did not accept "greener X: <fact>" as a qualified claim.
4. Round 4. In broad-claim-qualified, placement (a) now says that a fact after a colon or a dash is in the same sentence, with an example that matches no eval ("a kinder way to shop: every order ships in a box made from 100% recycled cardboard"). It also now says that one fact in the right place is enough even when the broad words say more than the fact. Result: luna 26/27, jev 27/27. Luna failed `careful-refill-captions` on broad-claim-qualified.
5. Round 5. broad-claim-qualified now also lists these as not broad claims: statements about plastic or recycled material in hashtags, practical statements about refilling such as keeping the bottle and pouring in a pouch, and hashtags that only name a product, a brand or refills. Result: luna 26/27, jev 27/27, the same total as round 4 (53/54). Luna still fails `careful-refill-captions` on broad-claim-qualified.

Round 5 matched as many evals in total as round 4 (53) and more than every earlier round (round 3: 52). So I did not restore an earlier test.yaml, and I froze round 5. On luna alone, round 3 (27/27) did better than round 5 (26/27), but round 3 missed two evals on jev. I applied the brief's comparison to the total across both models.

### Last round's tables (round 5)

```text
no-unqualified-green-claims on luna (gpt-6-luna): 26 of 27 eval(s) match; 146 decision call(s), 152213 input and 0 output token(s), 0.0152 USD
eval                               expected  actual  match  decisions  error
broad-claim-qualified-too-far      fail      fail    yes    6
broad-claim-same-sentence          pass      pass    yes    6
broad-hashtags-only                fail      fail    yes    4
broad-heading-alone                fail      fail    yes    4
broad-qualified-by-unbacked-fact   fail      fail    yes    4
careful-about-planet               pass      pass    yes    6
careful-earth-day-email            pass      pass    yes    6
careful-refill-captions            pass      fail    no     6
careful-refill-page                pass      pass    yes    6
careless-about-planet              fail      fail    yes    6
careless-earth-day-email           fail      fail    yes    6
careless-refill-captions           fail      fail    yes    6
careless-refill-page               fail      fail    yes    6
earth-day-mention-only             pass      pass    yes    4
fixture-files-unchanged            pass      pass    yes    8
less-plastic-without-figure        pass      pass    yes    6
non-environmental-claims           pass      pass    yes    6
not-selected-files                 skip      skip    yes    0
other-company-coffee-page          pass      pass    yes    6
other-skincare-brand-page          pass      pass    yes    6
plastic-saving-inflated            fail      fail    yes    6
plastic-saving-whole-range         fail      fail    yes    6
recycled-claim-all-packaging       fail      fail    yes    6
supplier-named-claim-still-judged  fail      fail    yes    6
unbacked-carbon-neutral-delivery   fail      fail    yes    4
unbacked-recyclable-pouch          fail      fail    yes    6
unrelated-returns-email            pass      pass    yes    4

no-unqualified-green-claims on jev (jev-latest): 27 of 27 eval(s) match; 146 decision call(s), 173765 input and 3212 output token(s), 0.0073 USD
(every eval matches: the same expected column as above, every actual equal to expected)
```

Remaining mismatch: luna fails `careful-refill-captions` on broad-claim-qualified, a false fail. It also failed in round 4 but passed in rounds 2 and 3, so the decision is close to the threshold. The proof output does not say which caption luna objected to. The only broad claim in the file is "A greener top-up: our refill pouch uses 70% less plastic than our bottle, by weight.", which is qualified in the same sentence. I am confident the expectation is right. There were no refusals and no errors in any round. All my proof folders are deleted.

## Prompts and evals changed

- I changed no eval after the first proof. All 27 were written once, before round 1.
- Task 3's opening line became "Some email housekeeping before the spring emails go out:" to bring the prompt to about 80 words. This was a wording change only, made after the gate was frozen. It does not touch gate/.
- No researched prompt was changed.

## Research and triage notes

- The research fixture says only "than the bottle", which is ambiguous for a brand with several bottles. I made it precise in the fixture and the rule: the 200 ml Everyday Cleanser refill pouch against the Everyday Cleanser bottle it refills, by weight.
- The grading note scores a broad word qualified in the next sentence one step below full marks. So the rule defines "right next to it" as the same sentence, with two exceptions: a heading may be qualified by the first sentence under it, and a hashtag by its caption. The rubric treats next-sentence qualification as a minor lapse, scored 8.
- The research marks the rule `scope: cross-file`. As the triage says (restate-policy), the two facts are written into each criterion as standing policy, and that worked.
- I used `emails/**/*.md` where the triage `how` has `emails/*.md`. This matches other entries and makes no difference in this fixture.
- Companion note: my select grep matches files that already exist in the fixtures of natural-is-not-safe, no-green-virtue-from-legal-minimum and no-offset-based-neutral-claims, so the harness will not pick this Test as a companion for those three. It matches no file in the other business fixtures present when I checked.

## Verification

- `loadEntry` passes. `agentests validate` passes in a fresh copy of the fixture with the final gate/ installed.
- The rule text appears word for word in skill/SKILL.md, gate/TEST.md and rubric.md, and its phrases appear nowhere in fixture/.
- The fixture's script and tests pass as shipped (8 tests). The tests ran only in scratch copies, so the fixture holds no caches.
- The rubric is 59 lines and the skill 65. The skill has no unescaped `$`.
- Only benchmarks/dataset/no-unqualified-green-claims/ is new in the repository from my work.

## Could not verify

- No agent run was made, so I could not check whether an untold Sonnet agent actually writes the careless copy, or whether it loads the skill from its description.
- The other-company scope works when another company's copy names that company and never mentions Fernleaf. Another skincare brand's page that names no company would be judged against Fernleaf's two facts.
- Luna's remaining false fail on careful captions may also hit real compliant captions in the luna arm.
