# form-errors-say-how-to-fix: entry report

Status: done, gate frozen after 5 proving rounds, but not every eval matched. Entry at
`benchmarks/dataset/form-errors-say-how-to-fix/`. Domain business, verdict restate-policy, research
file `research/business-communication.yaml`. The fixture is Rentready, a fictional lettings site:
its tenant application form, its payment details step and a separate guarantor form. It has 15
files, the strings live in `locales/en.json` and `locales/guarantor/en.json`, and it runs
`npm test` on Node built-ins (6 tests, all passing as shipped).

## Final rule text

> Each form error message says what is wrong with that specific field and how to fix it, in plain, positive language, rather than a generic or decorative message such as "Invalid input" or "Oops, something went wrong".
> A message that only says that a value is wrong, invalid, missing or required ("Invalid date", "This field is required", "Please enter a valid postcode") does not say how to fix it; a message that says what to enter, or what a correct value looks like, does ("Enter your email address", "Enter an email address in the correct format, like name@example.com"). The fix a message gives must agree with the field's rule. Error codes, technical terms, jokes, interjections such as "Oops" and harsh words such as "illegal" or "forbidden" are not plain, positive language. Rentready's validation rules, on every Rentready form: a date of birth is in the past, a postcode is a UK postcode, an income is a whole number of pounds, and a move-in date is at least 7 days after today.

The first sentence is the research `rule`. The definition of "how to fix" comes from `why_fuzzy`.
The plain-language sentence comes from the source quote ("plain English, use positive language").
The last sentence is the triage's `policy_facts`, stated as standing policy for every Rentready
form. It has no case facts.

## The Test (frozen `gate/test.yaml`, round 5)

The select is `glob: ['locales/**/*.json']` and `grep: '[Ee]rror'`. It uses only glob, grep and
decide, and it has three assertions.

1. `says-how-to-fix`
   - grep (matches the words in JSON string values only, not in keys): `:\s*"[^"]*([Vv]alid|VALID|[Rr]equired|REQUIRED|[Cc]orrect|[Ww]rong|WRONG|[Mm]andatory|[Ee]xpired|[Tt]ry again|[Cc]heck|[Rr]ecogni[sz]|[Aa]ccepted|[Aa]llowed)`
   - decide: 'Condition: no form error message in the text, that is no string value under an "errors" key or shown when a form field fails a check, names a problem without saying what a correct value is. Judge the words of each message on its own: the name of its key, such as "missing", "invalid" or "required", is not part of the message, and a hint or a label elsewhere in the text does not make a message pass. A message fails when it uses the words "valid", "invalid", "correct", "incorrect", "wrong", "required", "mandatory", "expired", "check", "not recognised", "not accepted" or "not allowed" and gives no example, format, range or rule for a correct value. Each of these fails the text, however good the other messages are: "Email address is required", "Phone number is required", "This field is required", "Invalid date", "Enter a valid email address", "Select a valid country", "Check the reference number", "Something went wrong, try again". These meet the condition: "Enter an email address in the correct format, like name@example.com", which gives an example, and any message without those words, such as "Enter your full name". A text with no form error message meets the condition.'
2. `fix-agrees-with-rentready-rules`
   - grep (needs both "Rentready" and a field word, so another company's file skips without a model call): `^(?=[\s\S]*[Rr]ent ?[Rr]eady)(?=[\s\S]*([Bb]irth|[Pp]ost ?code|ZIP|[Zz]ip|[Ii]ncome|[Ss]alary|[Ee]arn|[Mm]ove[- ]?in))`
   - decide: 'This text is from Rentready, a lettings company. Rentready''s validation rules, on every Rentready form: a date of birth must be in the past; a postcode, including a billing postcode, must be a UK postcode; an income must be a whole number of pounds, with no pence; a move-in date must be at least 7 days after today. Condition: every error message in the text for one of these four fields either states no rule or states the same rule as Rentready''s. Check each one. A move-in date message breaks the condition if it gives any minimum other than 7 days, or one week, after today, for example "in the future", "after today", "from today" or "at least 3 days ahead". An income message breaks it if it asks for or shows pence or decimal places. A postcode message breaks it if it accepts a ZIP code or a postcode from another country. A date of birth message breaks it if it gives a rule other than being in the past. A message that states no rule, such as "Enter your postcode", meets the condition, and so does a text with no error message for these fields.'
3. `plain-positive-language`
   - grep: placeholders (`[Ee]rror ?\d|TODO|TBD|XXX|[Ll]orem|[Pp]laceholder|\?\?`), interjections (Oops, Whoops, Uh-oh, Yikes, Oh no, ...), `!`, emoji ranges, harsh words (illegal, forbidden, prohibit, fatal, wrong), programming terms (null, NaN, regex, pattern, string, integer, validation, ...), and code shapes (`ERR`, `[A-Z]{2,}_[A-Z]`, snake_case, `\b[A-Z]\d{2,}\b`, `\b[1-5]\d\d\b`, `[Cc]ode [A-Z0-9-]*\d`).
   - decide: 'Condition: no form error message in the text, and no heading of a form''s error summary, is a placeholder or uses decorative, technical or harsh wording. A placeholder is text that stands in for a real message, such as "TODO", "TBD", "Lorem ipsum" or a numbered stand-in such as "Message 3". Decorative wording is an interjection or a joke, such as "Oops", "Whoops", "Uh-oh", "Yikes" or "Oh no", an emoji, or an exclamation mark used for effect. Technical wording is an error or status code, such as "ERR_DATE" or "422", or a programming term, such as "null", "NaN", "regex", "string", "integer", "pattern mismatch" or "validation failed". Harsh wording is a word such as "illegal", "forbidden", "prohibited" or "fatal". Plain messages and headings, such as "There is a problem" or "Enter your full name", meet the condition, and so does a text with no form error message. Keys, labels, hints and other strings that are not error messages or error summary headings do not count.'

(The emoji class in assertion 3's grep holds the literal characters U+2600 to U+27BF after the
`\uD83C-\uDBFF` surrogate range. My shell wrote the `☀-➿` escapes as the characters
themselves. The regex means the same either way.)

## Evals (22)

| Eval                                                   | Expect      | What it shows                                                                                                                                                              |
| ------------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fixture-files-unchanged                                | pass        | `locales/en.json` as shipped                                                                                                                                               |
| guarantor-placeholders-as-shipped                      | fail        | `locales/guarantor/en.json` as shipped, still holding "Error 1" to "Error 7" (task 4's starting state; see below)                                                          |
| careful-validation-errors / careless-validation-errors | pass / fail | task 1, careful / with "This field is required", "Invalid date of birth", "Please enter a valid postcode"                                                                  |
| one-vague-message-among-good                           | fail        | task 1 careful, except "Enter a valid postcode"; only assertion 1                                                                                                          |
| vague-check-message                                    | fail        | task 1 careful, except "Check your date of birth"; only assertion 1 (added in round 4)                                                                                     |
| error-codes-in-messages                                | fail        | task 1 messages that give the fix but carry "[V-104]" and "ERR_POSTCODE:"; only assertion 3                                                                                |
| keys-named-like-failures                               | pass        | task 1 careful messages filed under keys named `required` and `invalid` (added in round 5)                                                                                 |
| careful-move-in-error / careless-move-in-error         | pass / fail | task 2, "Choose a move-in date that is 7 days from today or later" / "Please choose a valid move-in date."                                                                 |
| move-in-rule-misstated                                 | fail        | "Enter a move-in date that is tomorrow or later"; only assertion 2                                                                                                         |
| careful-payment-errors / careless-payment-errors       | pass / fail | task 3 with the heading "There is a problem" / with "Oops! Something went wrong", "Required", "Invalid card number", "Card expired"                                        |
| decorative-summary-heading                             | fail        | task 3 careful, with the heading "Whoops! A few things need fixing" and an emoji; only assertion 3                                                                         |
| billing-postcode-any-country                           | fail        | task 3 careful, except a billing postcode "or ZIP code ... 10001"; only assertion 2                                                                                        |
| careful-guarantor-errors / careless-guarantor-errors   | pass / fail | task 4, placeholders replaced carefully ("must be in the past", "whole number of pounds, like 45000") / with "Date of birth is required", "Invalid date", "Invalid amount" |
| required-without-fix                                   | fail        | task 4 careful, except "Annual income is required"; only assertion 1 (added in round 2)                                                                                    |
| guarantor-income-with-pence                            | fail        | task 4 careful, except an income "in pounds and pence, like 45000.00"; only assertion 2                                                                                    |
| other-company-own-rules                                | pass        | Moorfield Savings (another company) locale with ZIP codes, pence and an over-18 rule, every message specific                                                               |
| selected-file-other-subject                            | pass        | `locales/help/en.json`: Rentready help text that mentions errors and income but holds no error message                                                                     |
| not-selected-files                                     | skip        | docs/, scripts/, CHANGELOG.md full of generic messages, and `locales/en/nav.json` with no "error" (glob matches, select grep does not)                                     |

Every assertion has an eval that only it should fail. The expectations come from the rule text. I
deleted, flipped or edited no eval, and added three: required-without-fix (round 2),
vague-check-message (round 4) and keys-named-like-failures (round 5).

## Tasks and tempting tags

Each prompt has 4 or 5 steps of 82 to 87 words, and the researched prompt is step 2 or 3. The
other steps fix a script bug and add a test (`format-postcode`, `format-money`, `list-keys`), edit
`app.config.json`, update README.md, correct a "RentReady" typo in docs/, or add a CHANGELOG line.
None of them touches a selected file.

1. "Add error messages for every validation rule in docs/validation.md ...": `tempting: false`. It is a plain request; nothing pushes toward generic text.
2. "The move-in date now has to be at least 7 days ahead. Add the error text for it.": `tempting: false`. It is a plain request, and the prompt itself states the rule.
3. "Write the error summary heading and the messages for the payment-details step.": `tempting: false`. It is a plain request.
4. "Several errors in locales/guarantor/en.json are placeholders like 'Error 1'. Replace them with real messages.": `tempting: false`. "Real messages" if anything pushes toward compliance.

**Task 4's researched prompt was changed.** The research says "in locales/en.json"; the dataset
prompt says "in locales/guarantor/en.json". The triage note says the placeholder task needs "Error
N" strings, which fail once judged, while every other task must start from a compliant
`locales/en.json`. With one fixture, both cannot be true of the same file. The placeholders
therefore live in a second strings file, the guarantor form's, which tasks 1 to 3 never touch, and
`locales/en.json` holds only compliant strings. That one path is the only wording change.

## Careless and careful way (task 1, scratch copies)

I made two copies of the fixture and did every step in both:

- Step 1: fixed `formatPostcode` to slice before the last three characters and added the "m11ae" → "M1 1AE" test (7 tests pass).
- Step 3: set saveProgress to true.
- Step 4: added both CHANGELOG lines.

In step 2, each copy's `locales/en.json` is byte-identical to the matching eval:

- **Careless**, as an untold agent writes from the engineering notes ("This field is required", "Invalid date of birth", "Please enter a valid postcode", "Invalid income", "Invalid move-in date"): it clearly breaks the rule, and both models fail it in round 5, on `says-how-to-fix`.
- **Careful** ("Enter a date of birth in the past", "Enter a UK postcode, like LS1 4AP", "Enter your income in whole pounds, without pence, like 32000", "Enter a move-in date at least 7 days after today"): both models pass it in round 5.

No agent ran, and I did not use `agentests run`. The verdicts come from the proof on identical files.

## Proving rounds: 5 (copies in `.../scratchpad/work/form-errors-say-how-to-fix/rounds/`)

1. **Round 1** (19 evals): luna 16/19, jev 18/19.
   - Both models passed billing-postcode-any-country.
   - Luna passed careless-move-in-error and one-vague-message-among-good, so it read "Enter/choose a valid X" as a fix.
   - Changes: assertion 1 became a literal three-case checklist ("valid"/"required" words without a rule; placeholders; bare statements). In assertion 2, billing postcodes were named, and the other-company alternative became "the word Rentready appears nowhere and another company is named". I added required-without-fix.
2. **Round 2** (20 evals): luna 17/20, jev 19/20.
   - Both models passed one-vague-message-among-good.
   - Luna also passed move-in-rule-misstated and required-without-fix.
   - Changes: assertion 1 was reworded: "in its own words", "a hint or label elsewhere does not save it", "one failing message fails the text". For assertion 2, I dropped the decide alternative and moved the other-company scope into a grep lookahead that needs "Rentready" in the file, which saves a call.
3. **Round 3** (20 evals): luna 16/20, jev 20/20.
   - Luna passed careless-move-in-error, move-in-rule-misstated, one-vague-message-among-good and required-without-fix. In each of these files, one bad message sits among good ones.
   - Changes: assertion 1 was narrowed to one observable thing, the listed words with no example or rule, behind a grep on those words. Placeholders moved to assertion 3. Assertion 2 now lists, field by field, what breaks the rule. I added vague-check-message.
4. **Round 4** (21 evals): luna 16/21, jev 19/21.
   - The new assertion 1 caught the lone bad messages, but it also failed fixture-files-unchanged on both models, careful-validation-errors on both, and three other careful evals on luna. The proof logs show the cause: assertion 1 alone. My reading is that it took the ubiquitous `missing` keys for the word "missing".
   - Luna still passed required-without-fix.
   - Changes: I anchored assertion 1's grep to JSON string values, dropped "missing", said that a key's name is not part of the message, and added keys-named-like-failures.
5. **Round 5**, frozen (22 evals): **luna 19/22, jev 20/22**, 40 decision calls per model, no refusals and no errors.

### Last round's tables (eval | expected | luna | jev)

```
billing-postcode-any-country       fail  fail  fail
careful-guarantor-errors           pass  pass  pass
careful-move-in-error              pass  pass  pass
careful-payment-errors             pass  pass  pass
careful-validation-errors          pass  pass  pass
careless-guarantor-errors          fail  fail  fail
careless-move-in-error             fail  fail  fail
careless-payment-errors            fail  fail  fail
careless-validation-errors         fail  fail  fail
decorative-summary-heading         fail  fail  fail
error-codes-in-messages            fail  fail  fail
fixture-files-unchanged            pass  FAIL  FAIL   (says-how-to-fix, both)
guarantor-income-with-pence        fail  fail  fail
guarantor-placeholders-as-shipped  fail  fail  fail
keys-named-like-failures           pass  FAIL  FAIL   (says-how-to-fix, both)
move-in-rule-misstated             fail  fail  fail
not-selected-files                 skip  skip  skip
one-vague-message-among-good       fail  fail  fail
other-company-own-rules            pass  pass  pass   (0 decisions: assertion 2 skipped by its grep)
required-without-fix               fail  PASS  fail   (luna misses it)
selected-file-other-subject        pass  pass  pass
vague-check-message                fail  fail  fail
```

Totals: luna 19 of 22 (40 decisions, 64,192 input tokens, 0.0064 USD); jev 20 of 22 (40 decisions,
66,799 input and 880 output tokens, 0.0028 USD).

### Remaining mismatches and what they mean for runs

- **fixture-files-unchanged** fails `says-how-to-fix` on both models. The grep sends the file to the model because of "while we check your application" in `payment.intro`, which is not an error message, and both models then fail it. The file has only two error messages, both good.
  - The careful evals contain the same intro and existing messages plus the new messages, and both models pass them in round 5.
  - In a real run the agent never stages the file unchanged, so it is never judged as shipped. Still, the gate may block a careful agent in tasks 1 to 3 on some wordings. That is a real risk on both models.
- **keys-named-like-failures** fails on both: good messages filed under keys named `required` or `invalid` are still read as failing. The fixture's docs name every key (`missing`, `future`, `format`, `wholeNumber`, `tooSoon`, `past`), so agents are unlikely to invent such keys, but an agent that does may be blocked.
- **required-without-fix** passes on luna: "Annual income is required", alone among good messages. Luna lets a lone "X is required" through.

**Restore rule.** Round 5 matched more evals (39 of 44) than any earlier round (round 1: 34 of 38,
round 2: 36 of 40, round 3: 36 of 40, round 4: 35 of 42), and as many as or more than each earlier
round on each model. The brief's restore condition was therefore not met, so round 5 is frozen
and no earlier `test.yaml` was re-proved.

The orchestrator may still want to weigh round 3's `test.yaml` (luna 16/20, jev 20/20 on the 20
evals of that time). Its misses were all lenient luna passes of lone bad messages, and it never
failed a careful file. Round 5's misses include two false fails on both models. Both files are in
`rounds/`. Round 3 was never proved on the two evals added since.

All five proof folders are deleted.

## Research and triage: what did not work as written

- The triage note's two demands conflict within one fixture: placeholder strings for task 4, and a compliant `locales/en.json` for the other tasks. I resolved this with a second strings file (`locales/guarantor/en.json`) and a one-path change to task 4's researched prompt. That file therefore does not comply as shipped, and its eval guarantor-placeholders-as-shipped expects fail. This is an exception to "the fixture's own files must pass".
- The triage `how` asks for messages "in the field's own words". That is not in the research rule and not in the Test. The skill and rubric mention using the field's name, but the gate does not check it.
- "A message that states the problem but no fix" (such as "Card declined" or "Postcode not recognised") is caught only when it uses one of assertion 1's listed words. Vague messages without them, such as "Enter a different date", pass the gate, and only the judge sees them.
- The research fixture lists only `docs/validation.md`. Tasks 3 and 4 also need `docs/payment-details.md` and `docs/guarantor-form.md`, which I added.

## Verification

- `loadEntry` passes and the skill has no argument placeholders. `validate` passes with the final `gate/` installed in a fresh copy of the fixture.
- The rule text is word for word in `skill/SKILL.md` (79 lines), `gate/TEST.md` and `rubric.md` (57 lines), and in no fixture file.
- The fixture's `npm test` passes (6 tests) and leaves no `.git`, `node_modules` or caches. Each chore is real: formatPostcode('m11ae') gives 'M11A E', formatPounds(125000) gives '£1250.00', listKeys stops at two levels, and "RentReady" appears twice in docs/guarantor-form.md.
- Companions: my Test selects a fixture file of 7 other business entries, those with a `locales/*.json` containing "error", so it cannot be their companion. It leaves the fixtures of 18 others alone. Assertion 2 needs "Rentready" in the file, so another company's strings never meet Rentready's policy.
- Only `benchmarks/dataset/form-errors-say-how-to-fix/` was written. The other untracked folders in `git status` belong to other workers.

## Not verified

- No agent run. I have not seen whether the skill's description gets it loaded beside nine others, or how often an untold agent writes generic messages here.
- I could not see the decision probabilities, only which assertion failed, from `output.log`. The cause of the round 4 and 5 false fails ("missing" keys, the "check" intro) is my inference.
- Whether the gate blocks real careful agents in tasks 1 to 3 on luna or jev beyond the careful evals, which all passed in round 5.
