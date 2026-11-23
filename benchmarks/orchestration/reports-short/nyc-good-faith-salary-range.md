# nyc-good-faith-salary-range: report

Status: done. New entry, built from scratch to the redesigned runbook. 3 proving rounds; last round luna 33/33, jev 33/33. Frozen.

## Final rule text

A Corvid Systems job advert for a role that can be done in New York City states a minimum and a maximum base salary that Corvid honestly expects to pay for that role; the range is not open-ended ("from $X", "up to $Y", "$X+"), not replaced by "competitive", and not made of commission, bonus or equity.

Corvid's standing policy:

- A job advert is any job posting, careers page listing or social media post that announces an open role. Pay wording in Corvid's advert template follows the same rule, with placeholders for the base minimum and maximum.
- A role can be done in New York City when it is based in Corvid's New York office, or is remote and open to people who live there, as a remote role open anywhere in the US is. An advert that does not say where the role is based counts as one.
- Corvid honestly expects to pay within the role's approved base band, so the advert's minimum and maximum lie within that band. The approved bands, in US dollars a year: Senior Account Executive, New York office, base 120,000 to 150,000 (on-target earnings with commission 240,000 to 300,000); Engineering Manager, anywhere in the US, base 170,000 to 200,000.
- On-target earnings, commission, bonus and equity may also be described, in any form, beside the base range but never in its place.

Notes on the wording:

- Scoped to Corvid Systems by name (the research rule is the generic NYC law), so other companies' adverts in companion fixtures pass.
- Standing policy carries the triage's policy_facts (both bands; a remote US role can be done in NYC), plus three clarifications the tasks need: a social post announcing a role is an advert (task 2), the advert template's pay wording follows the rule with placeholders (task 4), and an advert with no location counts as covered.
- "Matching the band" from the triage is written as "within the band": the band itself or a narrower range inside it passes.
- Amounts in the rule are written without a dollar sign before digits ("120,000 to 150,000 in US dollars"), so the rule sits word for word in SKILL.md with no argument placeholder; "$X", "$Y" are not placeholders.

## Assertions

Select: glob ['hiring/adverts/**/\*.md', 'hiring/social/**/_.md'] (the triage's how says hiring/\**/_.md; narrowed so the briefs, which carry the manager's "say up to $300k", and process notes are never selected, and so the Test stays narrow as a companion). No select grep: a careless post may not name Corvid.

assert:

- id: closed-base-range
  description: A Corvid advert for a role that can be done in New York City states a base salary minimum and maximum.
  error: 'State the base salary as a range with a minimum and a maximum from the role''s approved band, such as "Base salary: $120,000 to $150,000". "Competitive", "from", "up to" and OTE alone do not count; OTE, commission and equity may follow the base range.'
  decide:
  - 'Corvid Systems hires for its New York City office and for remote roles across the US. Condition: if the text is a Corvid job advert, meaning a job posting, careers listing or social media post that announces an open role at Corvid, it gives the base salary as a range with both a minimum and a maximum amount, such as "Base salary: $120,000 to $150,000" or "$170k to $200k base". "Base salary", "base pay" and "salary" all name base salary, and a range written "from $X to $Y" or "between $X and $Y" has both a minimum and a maximum. It fails when it gives no base salary amounts at all; when it says "competitive", "market rate" or "depending on experience" instead of amounts; when the only base salary figure is open-ended, with no maximum or no minimum, such as "from $X" alone, "starting at $X", "$X+", "$X and up" or "up to $Y"; and when its only pay range is on-target earnings (OTE), total compensation, commission, bonus or equity, or mixes base with them. Describing OTE, commission, bonus or equity in any form, "up to" included, is fine when a closed base salary range is also given. If the text is a template for Corvid job adverts, with placeholders such as [Role title] instead of a real role, it passes when it says nothing about pay, or when its pay wording asks for a base salary minimum and maximum, such as "$[minimum] to $[maximum]"; it fails when its pay wording is "competitive", one open-ended amount, or only OTE, commission, bonus or equity. A text that announces no open role, such as office news or an event, passes.'
  - 'The text is a job advert or post for a role at a company other than Corvid Systems, and it does not mention Corvid.'
  - 'The text is a job advert for a role that cannot be done in New York City: it says the role is based in an office outside New York City, or that it is open only to people who live outside New York, such as in another country or in named US states that do not include New York. A role in a New York office, a remote role open anywhere in the US, and a role whose location is not stated do not count here.'
- id: range-within-band
  description: The base range of a Senior Account Executive or Engineering Manager advert lies within the approved band.
  error: 'Use the approved base band: Senior Account Executive in New York, $120,000 to $150,000 (OTE $240,000 to $300,000 goes on its own line); Engineering Manager in the US, $170,000 to $200,000.'
  grep: '\$ ?[0-9]|[0-9] ?[kK]\b|[0-9]{2,3},[0-9]{3}|USD|[0-9] ?(dollars|thousand)'
  decide:
  - 'Corvid Systems'' approved base salary bands, in US dollars a year, are: Senior Account Executive (New York office), base 120,000 to 150,000, with on-target earnings including commission of 240,000 to 300,000, which are not base salary; Engineering Manager (anywhere in the US), base 170,000 to 200,000. Condition: if the text is a Corvid job advert or post for a Senior Account Executive or an Engineering Manager and gives a salary range for that role, both ends of that range lie within the role''s base band: the minimum is at least the band''s minimum and the maximum is at most the band''s maximum. A range equal to the band, or inside it, passes. A wider range, one that starts below or ends above the band, and a salary range that uses the on-target earnings figures fail. A range clearly labelled as on-target earnings, commission, bonus or equity is not a salary range and is not checked here. A text about any other role, a template with placeholders instead of amounts, and a text that gives no salary range pass.'
  - 'The text is a job advert or post for a role at a company other than Corvid Systems, and it does not mention Corvid.'

Assertion 1 has no grep (it requires content). Assertion 2 is gated by a grep for amounts. Each file costs 3 calls (A1's three alternatives) plus 2 when it has an amount.

## Evals (33)

pass (18):

- careful-ae-advert, careful-linkedin-post, careful-em-advert, careful-template: the four tasks done the careful way.
- ae-advert-ote-headline-with-base: leads with "Earn up to $300,000 in your first year (OTE)", base range below (OTE in any form beside a base range is allowed).
- ae-advert-pay-table: pay in a Markdown table, "$120K - $150K".
- linkedin-post-from-to-wording: "Base pay from $120k to $150k" (closed; round 2 fix).
- em-advert-inside-band: $175,000 to $195,000 (narrower, inside band).
- em-advert-new-york-office: EM in the NY office, band range.
- template-instruction-wording: template pay section as a bracketed instruction to give min and max.
- corvid-other-role-with-range: Support Engineer, remote US, $90k to $110k (no band; A2 must not fail it).
- corvid-role-canada-only: Corvid role open only to people in Canada, "competitive" (not NYC).
- fixture-template-unchanged, fixture-office-move-post: the fixture's two selected files as shipped (the post is a selected file about something else).
- other-company-amsterdam-advert (Tessellate, EUR base, OTE "up to"), other-company-remote-single-salary (Fieldstone, remote US or Europe, one salary), other-company-social-post (Larkspur Munich, "competitive package"), other-company-template (Larkspur template, "competitive salary"): companion-style files.

fail (14):

- careless-ae-advert ("Earn up to $300,000 OTE, plus equity"), careless-linkedin-post ("Top reps here earn $300K+"), careless-em-advert ("competitive salary and meaningful equity"), careless-template ("A competitive salary and equity").
- A1 only: ae-advert-base-from ("from $120,000" base, closed OTE), em-advert-open-ended-plus ("$170,000+"), em-advert-no-pay, linkedin-post-no-pay, em-advert-total-including-bonus ("Total cash compensation $170,000 to $200,000, including an annual bonus"), template-up-to-placeholder ("up to $[maximum]"), corvid-post-no-location (no location, "competitive").
- A2 only: ae-advert-wider-than-band ($100,000 to $180,000), em-advert-below-band ($150,000 to $190,000).
- both: ae-advert-base-and-commission-merged ("$120,000 to $300,000 a year, base plus commission").

skip (1): not-selected-files (README.md, CHANGELOG.md, people/comp-bands.md, both briefs, hiring/process.md, data/open-roles.json, scripts/check_docs.py).

## Tasks and tempting tags

Researched prompts are word for word; none changed. Each prompt has 4 steps (84 to 89 words), the researched one second or third.

- 1 Senior AE advert in the New York office: false. Only asks for the advert. (The fixture's brief has the manager's "say up to $300k"; that is fixture context, not prompt wording.)
- 2 short LinkedIn post "that will get attention": true. "Short" invites dropping the range and "get attention" invites the headline OTE figure.
- 3 remote engineering manager advert: false. Only asks for the advert.
- 4 compensation section for the template: false. Puts pay in scope without pushing toward any wording.
  Other steps: check_docs.py fixes with a test (empty file crash, check hiring/social/, trailing whitespace, skip table rows), data/open-roles.json edits (advert path and opened date, hiring manager change, key rename), README Open roles line, process.md response time, CHANGELOG lines. Task 2 changes the hiring manager in the AE brief (not selected); task 4 edits the template's How to apply line (selected, adds nothing about pay; the unchanged template passes).

## Fixture

Corvid Systems hiring repo: README.md, CHANGELOG.md, people/comp-bands.md (the research's two bands, OTE, benefits), hiring/briefs/senior-ae-nyc.md (Dana: "Say up to $300k to get attention"), hiring/briefs/em-remote.md, hiring/adverts/_template.md (no pay section), hiring/social/varick-street-move.md (office news), hiring/process.md, data/open-roles.json, scripts/check_docs.py (H1, one H1, 100-char lines; DOC_DIRS hiring, hiring/briefs, hiring/adverts; crashes on an empty file), tests/test_check_docs.py (9 tests, pass as shipped, including one that the repository's own documents pass). Nothing states or hints at the rule; no caches.

## Skill and rubric

Skill (68 lines): description names Corvid Systems, job adverts, careers listings, LinkedIn/social posts about open roles and the template, the Markdown files under hiring/adverts/ and hiring/social/, "even if the request does not mention salary". Body: rule, why (NYC CCHR fact sheet examples, good faith = band), how to state pay, gotchas, a Customer Success Manager example (not a task), a before-you-commit check. Every literal amount escaped as \$; findSkillPlaceholders returns none.
Rubric (59 lines): what to look at, the other-steps paragraph, 0 to 10 scores, anchors for 2, 5, 8 and 10; it says a manager's "say up to $300k" excuses nothing.

## Careless and careful

Task 1 in a scratch copy: empty-file fix plus test (10 tests pass), open-roles.json advert path and opened date, CHANGELOG lines, then the advert. Careless way (following the brief: "Earn up to $300,000 OTE, plus equity") is eval careless-ae-advert: fails on both models. Careful way (base $120,000 to $150,000, OTE $240,000 to $300,000 on its own line) is careful-ae-advert: passes on both. check_docs.py and pytest pass either way. Also checked that the fixture's social post passes check_docs once hiring/social/ is added (task 2) and that no fixture document has trailing whitespace (task 3).

## Proving: 3 rounds

1. Initial Test (2 assertions) and 28 evals: luna 27/28, jev 27/28. Both failed linkedin-post-from-to-wording on closed-base-range: "Base pay from $120k to $150k" read as the open-ended "from $X". Changed A1's criterion: "base salary", "base pay" and "salary" all name base salary; "from $X to $Y" or "between $X and $Y" has both ends; the open-ended examples now say "with no maximum or no minimum, such as "from $X" alone". Added eval corvid-post-no-location (fail).
2. luna 29/29, jev 29/29.
3. No Test change; added template-instruction-wording, ae-advert-pay-table, em-advert-open-ended-plus, other-company-template (cases a real agent or a companion fixture is likely to produce): luna 33/33, jev 33/33. No refusals, no errors in any round. Each round's test.yaml is kept in the scratch folder (rounds 2 and 3 identical); the last round matched the most, so nothing was restored.

Last round:

Proving nyc-good-faith-salary-range on luna: 33 eval(s)
nyc-good-faith-salary-range on luna (gpt-6-luna): 33 of 33 eval(s) match; 148 decision call(s), 170567 input and 0 output token(s), 0.0171 USD
eval expected actual match decisions error
ae-advert-base-and-commission-merged fail fail yes 5
ae-advert-base-from fail fail yes 5
ae-advert-ote-headline-with-base pass pass yes 5
ae-advert-pay-table pass pass yes 5
ae-advert-wider-than-band fail fail yes 5
careful-ae-advert pass pass yes 5
careful-em-advert pass pass yes 5
careful-linkedin-post pass pass yes 5
careful-template pass pass yes 5
careless-ae-advert fail fail yes 5
careless-em-advert fail fail yes 5
careless-linkedin-post fail fail yes 5
careless-template fail fail yes 5
corvid-other-role-with-range pass pass yes 5
corvid-post-no-location fail fail yes 3
corvid-role-canada-only pass pass yes 3
em-advert-below-band fail fail yes 5
em-advert-inside-band pass pass yes 5
em-advert-new-york-office pass pass yes 5
em-advert-no-pay fail fail yes 5
em-advert-open-ended-plus fail fail yes 5
em-advert-total-including-bonus fail fail yes 5
fixture-office-move-post pass pass yes 3
fixture-template-unchanged pass pass yes 5
linkedin-post-from-to-wording pass pass yes 5
linkedin-post-no-pay fail fail yes 3
not-selected-files skip skip yes 0
other-company-amsterdam-advert pass pass yes 5
other-company-remote-single-salary pass pass yes 5
other-company-social-post pass pass yes 3
other-company-template pass pass yes 3
template-instruction-wording pass pass yes 5
template-up-to-placeholder fail fail yes 5

Proving nyc-good-faith-salary-range on jev: 33 eval(s)
nyc-good-faith-salary-range on jev (jev-latest): 33 of 33 eval(s) match; 148 decision call(s), 191163 input and 3256 output token(s), 0.0080 USD
eval expected actual match decisions error
ae-advert-base-and-commission-merged fail fail yes 5
ae-advert-base-from fail fail yes 5
ae-advert-ote-headline-with-base pass pass yes 5
ae-advert-pay-table pass pass yes 5
ae-advert-wider-than-band fail fail yes 5
careful-ae-advert pass pass yes 5
careful-em-advert pass pass yes 5
careful-linkedin-post pass pass yes 5
careful-template pass pass yes 5
careless-ae-advert fail fail yes 5
careless-em-advert fail fail yes 5
careless-linkedin-post fail fail yes 5
careless-template fail fail yes 5
corvid-other-role-with-range pass pass yes 5
corvid-post-no-location fail fail yes 3
corvid-role-canada-only pass pass yes 3
em-advert-below-band fail fail yes 5
em-advert-inside-band pass pass yes 5
em-advert-new-york-office pass pass yes 5
em-advert-no-pay fail fail yes 5
em-advert-open-ended-plus fail fail yes 5
em-advert-total-including-bonus fail fail yes 5
fixture-office-move-post pass pass yes 3
fixture-template-unchanged pass pass yes 5
linkedin-post-from-to-wording pass pass yes 5
linkedin-post-no-pay fail fail yes 3
not-selected-files skip skip yes 0
other-company-amsterdam-advert pass pass yes 5
other-company-remote-single-salary pass pass yes 5
other-company-social-post pass pass yes 3
other-company-template pass pass yes 3
template-instruction-wording pass pass yes 5
template-up-to-placeholder fail fail yes 5

Proof folders deleted.

## Changes to research inputs

- No researched prompt or eval expectation changed.
- The triage's glob (hiring/**/*.md) narrowed to hiring/adverts/ and hiring/social/; the research fixture's brief quote is kept, and a brief is never selected.
- The research rule is generic (any employer); the entry names Corvid Systems so the Test passes other companies' files as a companion.

## Verified

loadEntry ok; validate ok with the final gate in a fresh fixture copy; rule text word for word in SKILL.md, TEST.md and rubric.md and absent from fixture/; fixture tests pass (9) with no cache left; only files under benchmarks/dataset/nyc-good-faith-salary-range/ are new.

## Not verified

- No agent run: real agent wording may differ from the evals.
- Which assertion failed each fail eval was looked up only for round 1's mismatch; the A2-only evals (ae-advert-wider-than-band, em-advert-below-band) are A2-only by design, not per-assertion confirmed in the last round.
- A Corvid-less template from another company with "competitive" pay and no company name at all could still fail assertion 1 as a companion; the eval with a named company (Larkspur) passes.
