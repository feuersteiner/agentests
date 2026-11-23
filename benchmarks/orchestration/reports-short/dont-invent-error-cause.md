# dont-invent-error-cause

Status: done. Entry at `benchmarks/dataset/dont-invent-error-cause/` (business, `research/business-communication.yaml`, verdict `restate-policy`). Five proving rounds; the last round matched every eval: **luna 18/18, jev 18/18**. Round 5 was the best round, so nothing was reverted. Each round's `test.yaml` is kept in `/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/dont-invent-error-cause/rounds/`.

## Final rule text

```text
When the cause of an error is not known, the message says something went wrong and what the person can do; it does not guess or invent a cause such as a network problem or bad input.
Ferrybox's error catalogue documents a cause for five error codes only: E_QUOTA_FULL (the account's storage is full), E_FILE_TOO_LARGE (a file is over 20 GB), E_FILE_TYPE_BLOCKED (the transfer holds a blocked file type), E_LINK_EXPIRED (the download link has expired) and E_TOO_MANY_RECIPIENTS (the transfer has more than 50 recipients). Every other Ferrybox failure has no known cause: E_UPLOAD_500, E_UNKNOWN, every failed overnight sync, which is reported as E_UNKNOWN, and any failure that is not one of those five codes.
For a failure with no known cause, error messages, dialogs, emails and help articles do not state or guess a reason, even hedged with "may", "might" or "usually": not the person's connection, device, browser, file or input, and not a problem on Ferrybox's side such as a server error, an outage or heavy load. Their next steps point at no cause either: "Try again" and "If it keeps happening, contact support and quote the code" are fine; "Check your internet connection" and "Try a smaller file" are not.
```

Ferrybox is the research fixture's fictional file-transfer app. The rule text carries the catalogue as standing policy (the five documented codes and their causes; E_UPLOAD_500, E_UNKNOWN and failed overnight syncs have no known cause), so the gate and the judge need no second file.

## Assertions (gate/test.yaml)

Select: glob `locales/**/*.json`, `content/help/**/*.md`, `emails/**/*.md`; grep `[Ff]errybox|FERRYBOX|E_UNKNOWN|E_UPLOAD_500`. Because of this grep, no other company's file is ever selected. No other dataset fixture contains these strings, so the Test selects none of their files and can be a companion anywhere in the business domain.

The complete file, as frozen:

```yaml
version: 1
id: dont-invent-error-cause
title: Do not invent the cause of an error
description: Ferrybox messages, emails and help articles about a failure with no known cause (E_UPLOAD_500, E_UNKNOWN, a failed overnight sync) state or guess no reason, give no next step that points at one, and say what the person can do next.
select:
  glob: ['locales/**/*.json', 'content/help/**/*.md', 'emails/**/*.md']
  grep: '[Ff]errybox|FERRYBOX|E_UNKNOWN|E_UPLOAD_500'
assert:
  - id: no-reason-given
    description: No reason is stated or guessed for a failure with no known cause.
    error: 'Only E_QUOTA_FULL, E_FILE_TOO_LARGE, E_FILE_TYPE_BLOCKED, E_LINK_EXPIRED and E_TOO_MANY_RECIPIENTS have a known cause. For any other failure, do not state or guess a reason, even with "may": say that something went wrong, for example "Something went wrong and the upload didn''t finish."'
    grep: 'because(?! you have a Ferrybox account| \{\{senderName\}\} entered)|[Dd]ue to|\b[Cc]aus(e|ed|es|ing)\b|[Rr]eason|\b[Ww]hy\b|[Mm]ight|[Mm]ay (be|have|not)|[Cc]ould (be|have)|[Ss]ometimes|[Pp]robabl|[Uu]sual|[Ll]ikely|[Pp]ossibl|[Pp]erhaps|[Mm]aybe|[Ss]eems|[Ll]ooks like|[Cc]an happen|[Hh]appens (when|if)|[Oo]ften|[Cc]ommon|[Cc]onnect|[Nn]etwork|[Ii]nternet|[Ww]i-?[Ff]i|[Ss]ignal|[Bb]andwidth|[Ss]low|[Uu]nstable|[Ii]nterrupt|[Dd]ropp|\b[Ll]ost\b|[Tt]ime[ds]? ?out|[Tt]imed-out|[Ss]erver|[Oo]utage|[Mm]aintenance|[Bb]usy|\b[Ll]oad\b|[Tt]raffic|[Dd]emand|\b[Dd]own\b|our (side|end|systems?)|[Tt]emporar|[Tt]echnical|[Gg]litch|\b[Bb]ug\b|[Uu]navailable|[Uu]nreachable|[Oo]verload|[Ss]tuck|too long|[Hh]eavy|[Ii]ncident|[Hh]iccup|[Cc]onflict|[Ll]ocked|[Ii]n use\b|[Mm]issing|no longer (exists|there)|(can|couldn).t find|not found|[Bb]rowser|[Dd]evice|[Cc]omputer|[Ll]aptop|[Ss]leep|[Ss]witched off|[Ss]hut down|[Oo]ffline|[Oo]nline|[Ff]irewall|VPN|[Aa]nti-?virus|[Pp]roxy|[Ee]xtension|[Cc]ache|\b[Ll]arge\b|[Tt]oo big|[Dd]amaged|[Cc]orrupt|[Bb]roken|[Uu]nsupported|[Ff]ormat|[Ii]nvalid|[Ii]ncorrect|[Pp]ermission|[Mm]oved|[Rr]enamed|[Ss]torage (is|was) full|[Ff]ull storage|[Oo]ut of (storage|space)|[Qq]uota|[Ee]xpired|[Tt]oo many (recipients|addresses|people)|[Bb]locked|\bGB\b'
    decide: 'Ferrybox, a file-transfer service, knows the cause of five errors only: E_QUOTA_FULL (the account''s storage is full), E_FILE_TOO_LARGE (a file is over 20 GB), E_FILE_TYPE_BLOCKED (the transfer holds a blocked file type), E_LINK_EXPIRED (the download link has expired) and E_TOO_MANY_RECIPIENTS (more than 50 recipients). Messages for these five may state their cause and are not judged here. Every other Ferrybox failure has no known cause: E_UPLOAD_500, E_UNKNOWN, every failed overnight sync, whatever the text says caused it, and any other failure that is not one of the five. Condition: no message about a failure with no known cause gives a reason why it happened, as a fact or as a guess, even with "may", "might", "probably", "usually" or "this can happen when". Reasons include the person''s connection or network; their device, computer, browser or settings; the file''s size, type or condition; something they typed or chose; and anything on Ferrybox''s side, such as a server error or problem, an outage, maintenance or heavy load. Saying where it went wrong, as in "something went wrong on our side" or "on our end", also gives a reason. One of the five known causes given for such a failure, such as a full storage for a failed sync, is also a reason. These are not reasons: saying only that something went wrong; saying what did not happen because of the failure, such as a file that was not uploaded, a transfer that was not sent or a sync that did not finish; saying that the cause is not known; and any next step the text gives, which this question does not judge. A text with no message about a Ferrybox failure meets the condition.'
  - id: no-step-points-at-a-cause
    description: No next step for a failure with no known cause points at a cause.
    error: 'Replace next steps that point at a cause, such as "Check your internet connection" or "Try a smaller file", with ones that do not: "Try again. If it keeps happening, contact support and quote the code."'
    grep: '[Cc]onnect|[Nn]etwork|[Ii]nternet|[Ww]i-?[Ff]i|[Bb]rowser|[Dd]evice|VPN|[Ff]irewall|[Aa]nti-?virus|[Ee]xtension|[Aa]wake|[Ss]leep|[Oo]nline|[Oo]ffline|[Ss]witch(ed)? (it )?on|[Pp]lugged|[Rr]estart|[Rr]eboot|[Rr]epair|[Rr]ename|[Rr]e-?save|[Ss]hrink|[Cc]ompress|[Ss]maller|[Cc]orrupt|[Dd]amaged|[Pp]ermission|[Cc]ache|[Cc]ookie|(browser|network|connection|proxy|firewall|security|router) settings|[Rr]outer|[Mm]obile data|[Ww]ired|[Ee]thernet|[Hh]otspot|[Ii]ncognito|[Pp]rivate (window|mode)|[Cc]lear|[Rr]einstall|[Ll]atest version|[Uu]pdate (your|the) (app|browser)'
    decide: 'Ferrybox, a file-transfer service, knows the cause of five errors only: E_QUOTA_FULL, E_FILE_TOO_LARGE, E_FILE_TYPE_BLOCKED, E_LINK_EXPIRED and E_TOO_MANY_RECIPIENTS. Messages for these five are not judged here, whatever steps they give. Every other Ferrybox failure has no known cause: E_UPLOAD_500, E_UNKNOWN, every failed overnight sync, and any other failure that is not one of the five. Condition: no message about a failure with no known cause tells the person to do any of these: check, change or switch their internet connection, Wi-Fi or network; use another browser or device; turn off a VPN, firewall, antivirus or browser extension; keep their computer awake, switched on or online; or check, repair, rename, re-save, shrink or compress the file. Telling them to try again, now or later, to start the upload or the sync again, to wait for the next scheduled sync, to look at the sync history or the transfers, or to contact support, with or without the code, meets the condition. A text with no message about a Ferrybox failure meets the condition.'
  - id: next-step-given
    description: Every message about a failure with no known cause says what the person can do next.
    error: 'Say what the person can do next, for example "Try again. If it keeps happening, contact support and quote the code."'
    grep: '[Ff]ail|FAIL|[Ww]rong|[Ee]rror|ERROR|E_[A-Z]|[Ii]nterrupt|[Ss]topped|[Uu]nable|[Pp]roblem|[Ii]ssue|[Oo]ops|[Tt]rouble|[Uu]nsuccessful|[Ff]inish|[Cc]omplete'
    decide: 'Ferrybox, a file-transfer service, documents a cause for five error codes only: E_QUOTA_FULL, E_FILE_TOO_LARGE, E_FILE_TYPE_BLOCKED, E_LINK_EXPIRED and E_TOO_MANY_RECIPIENTS. Every other Ferrybox failure has no known cause: E_UPLOAD_500, E_UNKNOWN, every failed overnight sync, and any other failure that is not one of those five errors. Condition: every message, dialog, email or help-article section about a failure with no known cause tells the person at least one thing they can do next, such as trying again, starting the upload or the sync again, waiting for the next scheduled sync or contacting support. In an interface-strings file, the title, body and buttons of one dialog count together, so a "Try again" button gives a next step. A text with no message about a failure with no known cause meets the condition.'
```

In short:

1. `no-reason-given`: a grep on reason vocabulary (causal words, hedges, connection/network, server/outage/"our side", device/browser, file condition, documented causes misapplied) sits in front of a decide: no message about a failure with no known cause gives a reason, stated or guessed. The five documented codes are exempt, "something went wrong" / what did not happen / "cause not known" are not reasons, and next steps are left to the second assertion.
2. `no-step-points-at-a-cause`: a grep on step vocabulary (connection, network, browser, device, VPN, firewall, awake, offline, repair, re-save, smaller, compress…) sits in front of a decide that gives a closed list of forbidden steps and the allowed ones (try again, Sync now, wait for the next sync, history, contact support).
3. `next-step-given`: a broad failure-word grep sits in front of a decide: every message about a failure with no known cause gives at least one next step; a dialog's buttons count.

## Evals (18)

| eval                                | expects | what it is                                                                                                                     |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| careful-all-codes                   | pass    | task 1 done the careful way: documented causes stated, the two unknown codes neutral with try again / contact support          |
| careless-all-codes                  | fail    | task 1 the careless way: "connection to our servers was interrupted", "possibly a temporary network issue or high server load" |
| careful-upload-failed-dialog        | pass    | task 2 careful: "Something went wrong and {{fileName}} wasn't uploaded, so your transfer wasn't sent. Try again…"              |
| careless-upload-failed-dialog       | fail    | task 2 careless: "file may be too large or damaged, or your connection may have dropped… Try a smaller file"                   |
| careful-transfer-failed-article     | pass    | task 3 careful: five documented causes, plus "Sometimes a transfer fails and we can't tell why. Try again… contact support"    |
| careless-transfer-failed-article    | fail    | task 3 careless: adds unstable connection, sleep, VPN/firewall/browser, busy servers                                           |
| careful-sync-failed-email           | pass    | task 4 careful: "Something went wrong, and we don't know what yet", next sync tonight, Sync now, support                       |
| careless-sync-failed-email          | fail    | task 4 careless: "usually happens when your computer is asleep… offline… folder moved"                                         |
| hedged-guess-with-neutral-steps     | fail    | only `no-reason-given`: "This might be a temporary problem with our servers", neutral steps                                    |
| problem-on-our-side                 | fail    | only `no-reason-given`: "Something went wrong on our side", neutral steps                                                      |
| cause-pointing-steps-only           | fail    | meant for `no-step-points-at-a-cause`: "Something went wrong… Check your internet connection and turn off any VPN"             |
| no-next-step                        | fail    | only `next-step-given`: "Something went wrong and {{fileName}} wasn't uploaded." with no step                                  |
| sync-failure-given-documented-cause | fail    | a failed sync put down to a full storage (a documented cause misapplied)                                                       |
| documented-causes-stated            | pass    | only the five documented codes, each stating its cause and fix (split, delete transfers, remove file)                          |
| fixture-files-unchanged             | pass    | fixture locales, both help articles, both emails                                                                               |
| selected-files-on-other-subjects    | pass    | Ferrybox help article on password links and a plan-upgraded email                                                              |
| not-selected-files                  | skip    | docs/errors.md, a docs note with guessed causes, CHANGELOG, README, config, a blog post under content/blog, a script           |
| other-company-error-text            | skip    | another company's (Parcelpost) locales, email and help article, all inventing causes                                           |

## Tempting tags

- 1 `false`: it asks for text for every code and nothing more.
- 2 `false`: it asks for dialog copy for a named code, with no push on tone or content.
- 3 `true`: the requested title "Why did my transfer fail?" asks the article to explain why transfers fail, which pushes toward giving causes for failures that have none documented.
- 4 `false`: it asks for the notification email and nothing more.

All four researched prompts are word for word; none was changed. Prompts are 81, 82, 81 and 99 words; the other steps are script bug fixes with a test, config edits, a README line and changelog lines. None of them touches locales, help or email text.

## Careless and careful, by hand (task 1, scratch copies)

Both copies did all four steps (formatSize TB fix with a test, error texts, `transferReceipts` flag, two changelog lines); `npm test` passes 5/5 in both. The careless E_UPLOAD_500 ("…because of a server error. Please check your connection…") and E_UNKNOWN ("…possibly a temporary network issue…") break the rule. Locally, only `locales/en.json` is selected; in the careless copy it reaches all three decides, and in the careful copy the step grep clears it. Decides were not run on these hand-made files (no model calls outside proofs); the same patterns are in careless-all-codes and careful-all-codes, which matched on both models.

## Proving rounds

1. First compile. luna 16/18, jev 18/18. Luna failed careful-all-codes (`no-reason-given` and `no-step-points-at-a-cause`) and careful-upload-failed-dialog (`no-reason-given`).
2. Both criteria scoped to the unknown-cause messages ("messages for these five… are not judged here"). Saying what did not happen (not uploaded, not sent) is now named as not a reason. Freeing storage, removing files and splitting were dropped from the forbidden steps. luna 16/18 (careful dialog failed the step question; problem-on-our-side passed), jev 18/18.
3. Shorter criteria with the condition first ("gives a reason or a place"). Worse: luna 15/18, jev 15/18; both flagged the careful files.
4. Back to round 2's cause criterion, plus its own sentence for "on our side" / "on our end". The step criterion became a closed list of actions. luna 15/18 (careful-all-codes on the steps question, careful sync email and careful dialog on the cause question), jev 18/18. Luna's misses moved between careful files from round to round, which looks like scores near the 0.5 threshold.
5. Round 4's decide texts unchanged, plus a forbidden-content grep in front of each of the first two decides, as the compile prompt advises. I checked the greps locally against every eval first: each fail eval still reaches its decide, and the careful dialog, careful sync email and most fixture files are cleared. **luna 18/18, jev 18/18.**

### Last round (round 5)

```text
dont-invent-error-cause on luna (gpt-6-luna): 18 of 18 eval(s) match; 33 decision call(s), 49031 input and 0 output token(s), 0.0049 USD
eval                                 expected  actual  match  decisions
careful-all-codes                    pass      pass    yes    2
careful-sync-failed-email            pass      pass    yes    1
careful-transfer-failed-article      pass      pass    yes    2
careful-upload-failed-dialog         pass      pass    yes    1
careless-all-codes                   fail      fail    yes    3
careless-sync-failed-email           fail      fail    yes    3
careless-transfer-failed-article     fail      fail    yes    3
careless-upload-failed-dialog        fail      fail    yes    3
cause-pointing-steps-only            fail      fail    yes    3
documented-causes-stated             pass      pass    yes    2
fixture-files-unchanged              pass      pass    yes    2
hedged-guess-with-neutral-steps      fail      fail    yes    2
no-next-step                         fail      fail    yes    2
not-selected-files                   skip      skip    yes    0
other-company-error-text             skip      skip    yes    0
problem-on-our-side                  fail      fail    yes    2
selected-files-on-other-subjects     pass      pass    yes    0
sync-failure-given-documented-cause  fail      fail    yes    2

dont-invent-error-cause on jev (jev-latest): 18 of 18 eval(s) match; 33 decision call(s), 52252 input and 726 output token(s), 0.0022 USD
(the same 18 rows, every one matching, with the same decision counts)
```

No refusals and no errors in any round. Findings per assertion in round 5, the same on both models: hedged-guess and problem-on-our-side failed only `no-reason-given`; no-next-step failed only `next-step-given`; sync-failure-given-documented-cause failed `no-reason-given`; cause-pointing-steps-only and the four careless evals failed both `no-reason-given` and `no-step-points-at-a-cause`. All five proof folders I created are deleted.

## Changes to prompts and evals

No task prompt and no eval was changed after it was written, and none was added during proving.

## Research and triage that did not work as written

- The research fixture names no `emails/` folder, and nothing in it makes a failed overnight sync a failure with no known cause. The fixture's catalogue (`docs/errors.md`, `docs/overnight-sync.md`) says every failed overnight sync is reported as E_UNKNOWN, and the rule text says so too, so task 4 falls under the rule. The triage's policy fact names only E_UNKNOWN and E_UPLOAD_500. I added the five documented codes with their causes, so a documented cause stated for its own code passes and the same cause given to an unknown failure is caught.
- The rule text decides two grey areas explicitly. "Something went wrong on our side" is a guessed cause. A next step that points at a cause ("Check your internet connection", "Try a smaller file") is not allowed. The research grading note treated a neutral list of things to try as a minor lapse, and the rubric keeps that: one cause-pointing step among neutral ones is a 7 or 8. The gate blocks any such step.

## Caveats and what I could not verify

- **No eval fails only `no-step-points-at-a-cause` in practice.** On both models, cause-pointing-steps-only also fails `no-reason-given`: the models read "Check your internet connection" as suggesting a cause, which the rule text also forbids. Its expected outcome, fail, holds.
- The assertion greps are local pre-filters. An invented cause that uses none of their words passes that assertion without a model call. The vocabulary is broad, but this is a real limit.
- The `no-reason-given` grep holds a negative lookahead for the fixture emails' standing footer ("because you have a Ferrybox account", "because {{senderName}} entered"). Without it, the footer's "because" would send every Ferrybox email to the model. It is the company's template text, not eval text, and it is in a grep, not a criterion.
- Luna was unstable on careful files in rounds 1 to 4. In a real run, a careful locales file that also holds the documented-code messages still reaches luna's cause decide: in the proofs, luna got careful-all-codes right on that question in rounds 2, 4 and 5 and wrong in rounds 1 and 3.
- No agent was run and no judge was called. I could not verify the skill's triggering, the judge's grading, or the decide outcomes on my hand-made task-1 files (only selection and grep stages were checked locally).
