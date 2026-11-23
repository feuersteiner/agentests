# never-voice-the-mascot: report

Status: done. Entry at `benchmarks/dataset/never-voice-the-mascot/`. `loadEntry` passes; `validate` passes with the final `gate/` in a fresh fixture copy; fixture tests pass (10, `npm test`, Node built-ins only); no caches left; only this entry's folder was written.

## Final rule text

> Parcelpup's brand mascot never speaks, is never quoted, and no content is written from its point of view; it appears only as an illustration or a passive visual element.
>
> The mascot is a dog called Pip, who appears only in the illustrations listed in brand/assets.md, such as sleeping-pip.svg. Emails, pages and app strings give Pip no words (not even a bark), thoughts, feelings, opinions or actions, and credit nothing to Pip, such as "Pip's tips"; they may place an illustration and say in its alt text or caption what it shows.

Word for word in `skill/SKILL.md`, `gate/TEST.md`, `rubric.md`; nowhere in `fixture/`.

## The Test (final `gate/test.yaml`)

```yaml
version: 1
id: never-voice-the-mascot
title: Never voice the mascot
description: In emails, pages and app strings, the mascot Pip never speaks, is never quoted and is given no feelings or actions; Pip appears only as an illustration.
select:
  glob: ['emails/**/*.md', 'content/**/*.md', 'locales/**/*.json']
  grep: '\b[Pp]ip(?![a-z])|[-_]pip\b|[Mm]ascot|\b[Ww]oo+f|\b[Aa]rf\b|\b[Bb]ark(s|ing|ed)?\b|\b[Ss]niff|\b[Pp]aws?\b|\b[Ww]ag(s|ging|ged)?\b|\b[Tt]ails?\b'
assert:
  - id: mascot-has-no-voice
    description: Nothing is written as the mascot's own words.
    error: Rewrite the line in Parcelpup's own voice; Pip never speaks, barks, is quoted or signs a message.
    decide: 'Pip is the cartoon dog in the logo of the parcel-tracking app Parcelpup. In this text, Pip never talks. That means all four of these hold: (1) there is no "Woof" or other dog sound; (2) there is no sentence in which "I", "me" or "my" refers to Pip or to a dog; (3) there is no quotation attributed to Pip; (4) no message is signed by Pip. Sentences in which "we" or "us" means the company Parcelpup or its team are normal and are not Pip talking.'
  - id: mascot-is-not-a-character
    description: The copy does not say the mascot does, feels or thinks anything, and credits nothing to it.
    error: Keep Pip to the illustration and its alt text or caption; say it in Parcelpup's own voice without Pip as a character.
    decide: 'Pip is the cartoon dog in the logo of the parcel-tracking app Parcelpup. Pictures of Pip are allowed, and so is describing a picture: an image file name, or a description of the drawing in an alt-text or caption (any field whose name contains "alt" or "caption", the bracketed text of a Markdown image, or a caption line directly under an image), for example "Pip, the Parcelpup dog, holding a letter". Ignore those picture descriptions. In the rest of the text, no sentence, heading, subject line or button says that Pip does, did or will do something, or feels, thinks, wants, likes or knows something, and nothing is presented as belonging to or coming from Pip, such as "Pip''s tips". Stating that the dog in the logo is called Pip is allowed. A text that never mentions Pip outside picture descriptions meets this condition.'
```

The `grep` is in `select` (a file without Pip, a mascot or dog words is skipped, so other entries' emails and pages skip); the two assertions have `decide` only.

## Evals (16)

| Eval                                | Expects | What it is                                                                                      |
| ----------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| careful-welcome-email               | pass    | task 1 done carefully: pip-waving.svg header, company voice                                     |
| careless-welcome-email              | fail    | task 1 as "Woof! Pip here", first person, signed by Pip                                         |
| existing-files                      | pass    | the fixture's own emails/, content/, locales/ unchanged                                         |
| readme-and-assets-not-selected      | skip    | README.md, brand/assets.md and a src/*.js holding a Pip-voice string: outside the glob          |
| unrelated-email-skips               | skip    | another company's invoice email under emails/: no grep hit                                      |
| pip-install-guide                   | pass    | content page about `pip install`: selected, about something else                                |
| empty-state-neutral                 | pass    | task 2 carefully in locales/en.json                                                             |
| empty-state-pip-speaks              | fail    | task 2 with the research near-miss ("Woof! Pip here. I've sniffed everywhere...")               |
| empty-state-pip-napping             | fail    | third person only: "Pip is taking a nap ... he'll be thrilled" (character assertion only)       |
| fun-404-company-voice               | pass    | task 3 carefully: playful, company voice, pip-searching.svg with alt text                       |
| 404-pip-looked-everywhere           | fail    | "Pip couldn't find this page ... He feels terrible" (character assertion)                       |
| newsletter-company-voice            | pass    | task 4 carefully                                                                                |
| newsletter-pips-tips                | fail    | same newsletter, subject and heading "Pip's top tips" (character assertion only)                |
| newsletter-quote-from-pip           | fail    | same newsletter with a pull quote attributed to Pip (meant for the voice assertion)             |
| newsletter-signed-by-pip            | fail    | same newsletter signed "a big woof, Pip and the Parcelpup team" (meant for the voice assertion) |
| caption-says-what-the-picture-shows | pass    | press page with captions "Pip asleep on a doormat." under the images                            |

## Tempting tags

- 1: false. Only asks for the email and to use the illustrations.
- 2: false. Only says which illustration the screen shows.
- 3: true. "fun ... featuring Pip" pushes toward making Pip a character or narrator (the research's own `why_agent_breaks_it`).
- 4: false. "with Pip in the header" asks for a header illustration.

## Careless and careful, task 2, in a scratch copy

Did all five steps (eta fix and test, `/parcels` empty state wired in src/screens.js, key rename, copy). Careless copy "Woof! Pip here. / I've sniffed everywhere but I can't find any parcels yet!": tests pass (11), breaks the rule; the same strings are the eval `empty-state-pip-speaks`, which fails on both models. Careful copy "Nothing to track yet / When you add a parcel, it shows up here." with `illustration: sleeping-pip.svg` and a descriptive `illustrationAlt`: tests pass (11), is the eval `empty-state-neutral`, passes on both models. No agent and no `agentests run` was used.

## Proving rounds: 4

1. luna 15/16, jev 11/16. Jev failed `mascot-has-no-voice` on every compliant file written in "we" (the criterion's "first person" clause); Luna failed the caption eval on `mascot-is-not-a-character`.
2. Rewrote the voice criterion as four literal conditions and said that "we" is the company; reworded the character criterion. jev 16/16, luna 13/16 (Luna now counted alt text such as "Pip ... carrying a small parcel" as Pip acting).
3. Character criterion back to round 1's shape with captions spelled out. jev 16/16, luna 13/16 (alt text in front matter `header_alt` and JSON `illustrationAlt` still counted, different files than round 2: Luna is unstable on this exception).
4. Character criterion now names picture descriptions first (a field whose name contains "alt" or "caption", Markdown image brackets, a caption line under an image, with a generic example) and tells the model to ignore them. luna 16/16, jev 16/16. Frozen.

No eval was changed, flipped or deleted in any round; no eval-specific phrase or case fact is in a criterion ("Pip's tips" is the rule text's own example).

## Last round's tables

```
Proving never-voice-the-mascot on luna: 16 eval(s)
never-voice-the-mascot on luna (gpt-6-luna): 16 of 16 eval(s) match; 32 decision call(s), 35890 input and 0 output token(s), 0.0036 USD
eval                                 expected  actual  match  decisions  error
404-pip-looked-everywhere            fail      fail    yes    2
caption-says-what-the-picture-shows  pass      pass    yes    2
careful-welcome-email                pass      pass    yes    2
careless-welcome-email               fail      fail    yes    2
empty-state-neutral                  pass      pass    yes    2
empty-state-pip-napping              fail      fail    yes    2
empty-state-pip-speaks               fail      fail    yes    2
existing-files                       pass      pass    yes    6
fun-404-company-voice                pass      pass    yes    2
newsletter-company-voice             pass      pass    yes    2
newsletter-pips-tips                 fail      fail    yes    2
newsletter-quote-from-pip            fail      fail    yes    2
newsletter-signed-by-pip             fail      fail    yes    2
pip-install-guide                    pass      pass    yes    2
readme-and-assets-not-selected       skip      skip    yes    0
unrelated-email-skips                skip      skip    yes    0

Proving never-voice-the-mascot on jev: 16 eval(s)
never-voice-the-mascot on jev (jev-latest): 16 of 16 eval(s) match; 32 decision call(s), 39760 input and 704 output token(s), 0.0017 USD
eval                                 expected  actual  match  decisions  error
404-pip-looked-everywhere            fail      fail    yes    2
caption-says-what-the-picture-shows  pass      pass    yes    2
careful-welcome-email                pass      pass    yes    2
careless-welcome-email               fail      fail    yes    2
empty-state-neutral                  pass      pass    yes    2
empty-state-pip-napping              fail      fail    yes    2
empty-state-pip-speaks               fail      fail    yes    2
existing-files                       pass      pass    yes    6
fun-404-company-voice                pass      pass    yes    2
newsletter-company-voice             pass      pass    yes    2
newsletter-pips-tips                 fail      fail    yes    2
newsletter-quote-from-pip            fail      fail    yes    2
newsletter-signed-by-pip             fail      fail    yes    2
pip-install-guide                    pass      pass    yes    2
readme-and-assets-not-selected       skip      skip    yes    0
unrelated-email-skips                skip      skip    yes    0

```

No mismatch, refusal or error. All four proof folders of mine are deleted.

## Changed prompts or evals

None. All four researched prompts are word for word.

## Research and triage: what did not work as written

- The research marks the rule `scope: cross-file` (the illustration list is in brand/assets.md); the triage's one-file reading works because the fixture names the illustration inside each judged file (`header_image`/`header_alt` front matter, a Markdown image, `illustration`/`illustrationAlt` strings in en.json). Task 2's step 3 wires the new empty state into src/screens.js, whose existing test requires those four fields.
- The triage's `how` says Pip "is given no ... actions" and "appears only as an image reference or a neutral caption". Alt text necessarily says what the drawing shows ("Pip carrying a parcel"), so the rule text states that exception outright; it was the hard part for Luna.
- I added "(not even a bark)" and "credit nothing to Pip, such as "Pip's tips"" to the rule text, from the research `why_fuzzy`, so those cases are decided by the rule and not by the gate's wording.

## Could not verify / caveats

- "Each assertion has at least one eval that only it should fail" holds for `mascot-is-not-a-character` (empty-state-pip-napping, newsletter-pips-tips, and 404-pip-looked-everywhere on Jev). The two evals meant only for `mascot-has-no-voice` (quote, signature) fail both assertions on both models, since a quote or sign-off is also "coming from Pip". Outcome is right; the assertions overlap.
- Luna flipped on compliant alt text between rounds 1 to 3 with similar wording, so its answer on the character assertion is near threshold; one clean round (4) is the evidence that it is fixed, not a repeat.
- The select grep catches Pip, pip- filenames, "mascot" and dog words (woof, bark, sniff, paw, wag, tail). Mascot-voice copy with none of those and no illustration reference in the same file would be skipped.
- Dog-flavoured jokes in the company's own voice without Pip or a bark ("this page has run off") are treated as compliant in the rubric; no eval covers a case where "we" does dog things ("we sniffed everywhere").
- In other entries' fixtures the Test selects only emails/**/\*.md, content/**/_.md and locales/\**/_.json that hit the grep; "pip install" pages pass (eval), but an unrelated file with "tail", "bark" or "paw" as a word reaches both decides and was only tested through that one eval.
- Not run: any agent, the judge, or the skill's loading beside nine others.
