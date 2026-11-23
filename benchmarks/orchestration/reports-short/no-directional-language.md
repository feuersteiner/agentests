# no-directional-language: report

Entry: `/home/user/agentests/benchmarks/dataset/no-directional-language/` (business, `research/business-communication.yaml`, verdict `as-is`). Status: **done**. 4 proving rounds; the last one matched every eval on both models, so the Test is frozen.

## Final rule text

> Help articles, emails to users and interface text name the control, menu, tab, section or label the reader should find or use and never locate it by its position on the screen or page, its colour or the look of its icon ("in the right sidebar", "the button above", "the green icon at the top", "the gear icon"), even alongside its name.
> This covers words such as left, right, top, bottom, corner, sidebar, above, below, next to and "scroll down", and a control's colour, shape or icon picture ("the pencil icon", "the three dots"). It does not cover a reference to a part of the text by its order ("the steps below", "the next section"), a control's own label that contains such a word ("select **Align left**"), or alt text that says what an image shows.

It appears word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and nowhere in `fixture/`.

Choices beyond the research `rule`:

- A position or look hint breaks the rule **even alongside the control's name**. The research rule speaks of instructions that "depend on" seeing the layout; its grading note deducts for "one positional hint alongside a named control", and the Mailchimp quote says "Avoid directional instructions". The stricter line is also the one a gate and a judge can apply consistently.
- References to parts of the text by order ("the steps below") are allowed, following the research `why_fuzzy`; a button or link is never "a part of the text", so "the button below" in an email breaks the rule.
- The subject is "the control, menu, tab, section or label the reader should find or use", so a status label located by colour or place ("a green Live badge next to its name") is covered too.

## Selection and assertions (`gate/test.yaml`)

`select.glob`: `content/help/**/*.md`, `emails/**/*.md`, `locales/**/*.json` (the triage's `how`). `select.grep`: the union of the three assertion greps below without the bold-label lookbehind. It selects a file only when it holds a position or look word, so the Test leaves 26 of the 32 other business fixtures now in the dataset alone and can be their companion. It selects 6, each for a real directional phrase or a near miss already in that fixture: no-easy-or-simple (`content/help/publish-a-form.md`, "in the top right corner"), no-idioms-for-translation (`create-a-board.md`, sidebar / at the right / top), no-preannouncing-features (`getting-started.md`, `offline.md`), never-voice-the-mascot (alt text "beside"), no-false-urgency ("everything below"), natural-is-not-safe ("symbol").

1. `no-screen-position`
   - grep: `(?<=(?:^|\n)(?:[^*\n]|\*(?!\*)|\*\*[^*\n]*\*\*)*)(?:\b([Ll]eft|[Rr]ight)[- ]?(hand|side|sidebar|panel|pane|column|corner|edge|menu|rail|bar|most)\b|\b([Oo]n|[Tt]o|[Aa]t|[Ii]n|[Ff]rom|[Tt]owards?) the (far |top |bottom |upper |lower )?(left|right)\b|\b(at|on|far) (left|right)\b|\b([Tt]op|[Bb]ottom|[Uu]pper|[Ll]ower|[Ff]ar)[- ](left|right)\b|\b([Tt]op|[Bb]ottom)\b(?![- ](tips?|plans?|priorit(y|ies)|up|ups|level|picks?|sellers?|choices?|rated|quality|line|dollar|notch|ten|five|three)\b)|[Cc]orner|[Ss]ide ?bar|\b[Ss]ide (panel|menu)|\b[Bb]eside\b|\b[Nn]ext to\b|[Ss]croll)`. The leading lookbehind skips words inside a `**bold**` span on the same line, so a control's own label (**Move to top**) never reaches the model.
   - decide: 'The text never says where on the screen a part of the app is, such as a button, link, menu, tab, panel, field or badge, for example "in the right sidebar", "on the left", "at the top", "in the top right corner", "next to the form name" or "scroll down to". This holds even when the control is also named, as in "click Publish in the top right corner". These do not count: words that are part of a control's name, written in bold, such as **Align left** or **Back to top**; mouse actions such as a right-click; and these words in another sense that says nothing about the screen, such as "right away", "the right plan", "top tips", "3 days left" or "on top of" meaning "in addition".'
2. `no-above-or-below`
   - grep: `(?<=(?:^|\n)(?:[^*\n]|\*(?!\*)|\*\*[^*\n]*\*\*)*)(?:\b[Aa]bove\b|\b[Bb]elow\b|[Bb]eneath|[Uu]nderneath)`
   - decide: 'The text never says that a button, link, menu, tab, panel or field is above or below something, for example "the button below", "the link above" or "the Share tab, below the Publish button". These do not count: "above" or "below" pointing to a part of the text itself that is not a button or link, such as "the steps below", "the table below" or "the section above"; "under" followed by the name of a menu, tab or section, as in "under Billing"; and "above" or "below" in another sense that says nothing about the screen, such as a price above 20 euros.'
3. `no-looks`
   - grep: `\b(green|blue|red|orange|yellow|purple|pink|gr[ae]y|black|white|teal)\b|\b[Ii]cons?\b|\b[Gg]ear\b|\b[Cc]og\b|[Pp]encil|\b[Dd]ots\b|[Tt]hree[- ]dot|[Ee]llipsis|[Kk]ebab|[Hh]amburger|[Cc]hevron|[Cc]aret|\b[Aa]rrows?\b|[Mm]agnifying|[Tt]rash|\b[Bb]in\b|[Pp]lus (sign|symbol|button|icon)|\+ ?(sign|button|icon)|\(\+\)|"\+"|\b[Ss]ymbol|\b[Ss]tar\b|\b[Bb]ell\b|[Ll]ightning|\b[Ee]ye\b|[Ss]haped|\b[Tt]he X\b|⋮|⋯|⚙`
   - decide: 'The text never points the reader to a button, link, menu, tab, field or badge by how it looks: not by its colour, as in "the green button" or "fields marked in red", not by its shape, and not by the picture on its icon, as in "the gear icon", "the pencil", "the three dots", "the plus sign" or "the trash can". This holds even when the control is also named, as in "the blue Save button". Everything else passes, including alt text or a caption that says what an image shows, and colours or pictures that do not point to a part of the app, such as brand colours, a chart or an illustration.'

No criterion carries company policy (the verdict is `as-is`). Criteria name parts of "the app" generically, so another company's files are judged the same way (eval `other-company-help-article`).

## Evals (23)

| Eval                               | Expects | What it is                                                                                                                                                                                      |
| ---------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| careful-conditional-logic-article  | pass    | Task 1 done carefully; "The steps below", "Under **When**"                                                                                                                                      |
| careless-conditional-logic-article | fail    | Task 1 untold: panel on the right, blue **Add rule** with a plus sign, trash-can icon, green **Publish** top right                                                                              |
| careful-onboarding-tour            | skip    | Task 2 done carefully; no position or look word, so nothing is selected                                                                                                                         |
| careless-onboarding-tour           | fail    | Task 2 untold: "panel on the left", "right-hand panel", eye icon, green Publish top right                                                                                                       |
| careful-publish-email              | pass    | Task 3 done carefully; "the three steps below"                                                                                                                                                  |
| careless-publish-email             | fail    | Task 3 untold: green **Publish** top right, green **Live** badge next to name, "the button below"                                                                                               |
| careful-custom-domain-article      | pass    | Task 4 done carefully; "the table below"                                                                                                                                                        |
| careless-custom-domain-article     | fail    | Task 4 untold: gear icon on the left rail, tabs along the top, blue **Check DNS** on the right, three dots far right                                                                            |
| fixture-files-unchanged            | pass    | The fixture's help articles, email and locale file as shipped                                                                                                                                   |
| not-selected-files                 | skip    | docs/ui-map.md, README, CHANGELOG (with a positional draft note), a script, content/landing/home.md with "green button in the top right corner"                                                 |
| selected-file-without-cues         | skip    | A help article that only names controls                                                                                                                                                         |
| words-in-other-senses              | pass    | Maintenance email ("Above all", "On top of that", "below 25 °C", "next to nothing", "keep an eye on", "Right-click") and locale strings ("currency symbol", "red flag", "plans above 10 seats") |
| other-company-help-article         | pass    | A Brightdesk help article that names controls, with "the steps below" and "the section below"                                                                                                   |
| position-hint-beside-name          | fail    | "the form's name in the top left corner" (only `no-screen-position`)                                                                                                                            |
| scroll-down-to-section             | fail    | "Scroll down to **Danger zone**" (only `no-screen-position`)                                                                                                                                    |
| label-beside-position-hint         | fail    | Label **Pin to top** plus "**More** menu, at the right end of its row" (only `no-screen-position`; added round 4)                                                                               |
| email-button-below                 | fail    | "Select the button below" in an email (only `no-above-or-below`)                                                                                                                                |
| app-position-above-below           | fail    | "**Filter**, just below the response count" (only `no-above-or-below`; added round 3)                                                                                                           |
| looks-icon-only                    | fail    | "Select the pencil icon" (only `no-looks`)                                                                                                                                                      |
| looks-colour-in-tooltip            | fail    | Locale hint "select the green Publish button" (only `no-looks`)                                                                                                                                 |
| text-order-references              | pass    | "the table below", "the steps below", "the next section", "the section above"                                                                                                                   |
| control-label-contains-word        | pass    | **Move to top**, **Move up**, **Move down**, **Move to bottom**                                                                                                                                 |
| alt-text-describes-image           | pass    | Email image alt "a green paper plane flying above an open envelope"                                                                                                                             |

No eval's expectation was changed or flipped. Two evals were added (above).

## Tasks and tempting tags

| Task                                                    | tempting | Reason                                                                                                                                                         |
| ------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 conditional-logic article from docs/ui-map.md         | false    | Asks for the article from the UI map; nothing in the wording asks where things are. The map holds positions next to names, so the chance is there, not a push. |
| 2 five-step tooltip tour in locales/en.json             | false    | Plain request for tour strings.                                                                                                                                |
| 3 'How to publish your form' email                      | false    | Plain request for the email.                                                                                                                                   |
| 4 update custom-domain.md "for the new settings layout" | true     | The wording frames the update as being about the new layout, which pushes toward describing where things now sit.                                              |

Each prompt has 4 or 5 steps, 93 to 102 words, and holds its researched prompt word for word, never first. The other steps are a script fix with a test (check-links, check-locales, frontmatter colon, frontmatter quotes), helpNav / email sequence / redirect entries in site.config.json, package.json version, README lines and CHANGELOG lines: none touches a file the Test selects. No researched prompt was changed. After the proofs I lengthened task 2's prompt from 71 to 102 words by adding a README step. Prompts are not part of the gate, so nothing in `gate/` changed.

## Careless and careful by hand (task 4, in scratch copies)

Both ways I fixed the frontmatter quotes bug with a test, added the redirect and two CHANGELOG lines (`npm test` 10/10 passing; check-links, check-locales and frontmatter clean). The careless article ("Click the gear icon at the bottom of the navigation rail on the left", "the **Domains** tab along the top", "**Add domain** in the top right corner", "the blue **Check DNS** button on the right", "the three dots at the far right") is selected and matches the greps of `no-screen-position` and `no-looks`; it is the `careless-custom-domain-article` eval, which failed on both models. The careful article ("Open **Settings** > **Domains**", "In the domain's row, select **Check DNS**", "open **More** ... select **Remove**") is selected only through "the table below" and reaches only `no-above-or-below`; it is `careful-custom-domain-article`, which passed on both. The chores' files (scripts, site.config.json, CHANGELOG.md) are not selected. The other three careless/careful pairs are the evals of the same name.

## Proving rounds

Copies of every round's `test.yaml` are in `/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/no-directional-language/rounds/`.

1. Two assertions (`no-position`, `no-looks`); broad left/right/top/colour greps at first, narrowed before round 1 so that "left our warehouse", "not right", "Yellow Catuaí" and "Right-click" in other fixtures are not selected. **luna 21/21, jev 18/21** (jev failed careful-conditional-logic-article, control-label-contains-word, words-in-other-senses, all on `no-position`).
2. Reworded both criteria as a literal list of positions, with exceptions for bold control names, "under"/">" plus a name, right-click, and other senses. **luna 18/21, jev 21/21** (luna failed control-label-contains-word and words-in-other-senses, and passed email-button-below: it read the email's button as "a part of the text").
3. Split position into `no-screen-position` (left/right/top/bottom/corner/sidebar/next to/scroll) and `no-above-or-below` (button or link above/below versus parts of the text), back in round 1's phrasing that luna preferred; added eval app-position-above-below. **luna 21/22, jev 21/22** (both failed control-label-contains-word on `no-screen-position`).
4. Added the bold-span lookbehind to the greps of `no-screen-position` and `no-above-or-below`, so a word inside a bold control label never reaches the model; added eval label-beside-position-hint to show a real hint next to such a label still fails. **luna 23/23, jev 23/23**.

Last round's tables:

```text
no-directional-language on luna (gpt-6-luna): 23 of 23 eval(s) match; 29 decision call(s), 30628 input and 0 output token(s), 0.0031 USD
eval                                expected  actual  match  decisions  error
alt-text-describes-image            pass      pass    yes    2
app-position-above-below            fail      fail    yes    1
careful-conditional-logic-article   pass      pass    yes    1
careful-custom-domain-article       pass      pass    yes    1
careful-onboarding-tour             skip      skip    yes    0
careful-publish-email               pass      pass    yes    1
careless-conditional-logic-article  fail      fail    yes    2
careless-custom-domain-article      fail      fail    yes    2
careless-onboarding-tour            fail      fail    yes    2
careless-publish-email              fail      fail    yes    3
control-label-contains-word         pass      pass    yes    0
email-button-below                  fail      fail    yes    1
fixture-files-unchanged             pass      pass    yes    1
label-beside-position-hint          fail      fail    yes    1
looks-colour-in-tooltip             fail      fail    yes    1
looks-icon-only                     fail      fail    yes    1
not-selected-files                  skip      skip    yes    0
other-company-help-article          pass      pass    yes    1
position-hint-beside-name           fail      fail    yes    1
scroll-down-to-section              fail      fail    yes    1
selected-file-without-cues          skip      skip    yes    0
text-order-references               pass      pass    yes    1
words-in-other-senses               pass      pass    yes    5

no-directional-language on jev (jev-latest): 23 of 23 eval(s) match; 29 decision call(s), 34095 input and 638 output token(s), 0.0014 USD
eval                                expected  actual  match  decisions  error
alt-text-describes-image            pass      pass    yes    2
app-position-above-below            fail      fail    yes    1
careful-conditional-logic-article   pass      pass    yes    1
careful-custom-domain-article       pass      pass    yes    1
careful-onboarding-tour             skip      skip    yes    0
careful-publish-email               pass      pass    yes    1
careless-conditional-logic-article  fail      fail    yes    2
careless-custom-domain-article      fail      fail    yes    2
careless-onboarding-tour            fail      fail    yes    2
careless-publish-email              fail      fail    yes    3
control-label-contains-word         pass      pass    yes    0
email-button-below                  fail      fail    yes    1
fixture-files-unchanged             pass      pass    yes    1
label-beside-position-hint          fail      fail    yes    1
looks-colour-in-tooltip             fail      fail    yes    1
looks-icon-only                     fail      fail    yes    1
not-selected-files                  skip      skip    yes    0
other-company-help-article          pass      pass    yes    1
position-hint-beside-name           fail      fail    yes    1
scroll-down-to-section              fail      fail    yes    1
selected-file-without-cues          skip      skip    yes    0
text-order-references               pass      pass    yes    1
words-in-other-senses               pass      pass    yes    5
```

No refusals and no errors in any round. All four proof folders were deleted. The last round was also the best, so no earlier `test.yaml` was restored.

## Notes for review

- Criterion examples. `no-above-or-below` uses "the button below" and "the link above", and `no-screen-position` uses "scroll down to". These are the rule text's own examples ("the button above", "scroll down"), not phrases taken from one eval, though the evals email-button-below and scroll-down-to-section use similar words. In round 1 an example was "the button below"; from round 2 the position criterion used "the button above". Bold labels in the criterion (**Align left**, **Back to top**) are not in any eval.
- The bold-span lookbehind in two greps is deterministic and relies on Markdown `**` labels. A label written without bold (a JSON string such as "Move to top") still goes to the model, which the exception sentence covers.
- The careful onboarding tour expects `skip`: careful tour text tends to hold no position or look word, so the Test selects nothing. That follows from the select grep, not from a model.
- Fixture: Mapleform, the company the research names, which the no-easy-or-simple entry also uses. The files are my own. After the Test was frozen I removed "and in the screen reader; use them exactly" from `fixture/docs/ui-map.md` because it hinted at the rule. The copy of ui-map.md inside the frozen `not-selected-files` eval keeps the old sentence; that eval is skipped by glob, so its content does not matter.
- Research and triage worked as written: the research fixture (a UI map with control names next to positions and a green Publish button top right) and all four tasks are usable as they stand.

## Verification

- `loadEntry` passes; `validate` passes with the final `gate/` in a fresh copy of the fixture; no skill placeholders.
- The rule text is word for word in SKILL.md, TEST.md and rubric.md (59 lines), and not in the fixture; the skill is 73 lines.
- The fixture's `npm test` passes (9 tests) and its three checks exit 0. Tests ran only in scratch copies, so no cache is left in the entry.
- Only `benchmarks/dataset/no-directional-language/` is new in the repository; no git command changed anything.

## Not verified

- No agent was run, so how a real agent does the tasks, and whether it loads the skill from its description, is untested.
- The gate's decisions on hand-made task results are known only through evals with identical files (the four careful/careless pairs). Nothing ran `agentests run` on a whole workspace.
- The `tempting` tags are judgment calls (task 4 true, the rest false).
