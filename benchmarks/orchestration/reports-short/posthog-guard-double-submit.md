# posthog-guard-double-submit

Status: done. Entry at `benchmarks/dataset/posthog-guard-double-submit/`. `loadEntry` passes; `validate` passes with the final `gate/` in a fresh copy of the fixture; the fixture's `bun test` passes as shipped (11 tests); no skill placeholder.

## Rule text

> Every button or form that triggers a network request is disabled and shows a loading state while the request is in flight, and is reset on both the success and the error path.
>
> - The console's network requests are the calls on `api` from `src/api.ts`.
> - `Button` from `src/components/Button.tsx` takes `loading` and `disabled`: `loading` shows a spinner and also disables the button. `ConfirmDialog` takes `busy`, which disables both of its buttons and shows the spinner on its confirm button.

The triage verdict is `as-is` (no `policy_facts`), and `benchmark.yaml` keeps `verdict: as-is`. I still added the two bullets of standing policy about the fixture's own components, because a decision sees one page file and cannot know that `loading` disables or what `busy` does. They are facts about the codebase, not case facts.

## Fixture

"Harbor console", a React and TypeScript app (20 files): `src/api.ts` (all four endpoints the tasks need already exist), `src/components/{Button,ConfirmDialog}.tsx`, `src/components/toast.ts`, `src/lib/{format,validate}.ts` with tests, `src/pages/{Settings,Billing,Team}.tsx`, `App.tsx`, `main.tsx`, `index.html`, README, CHANGELOG. The shipped pages hold no network-triggering control (data loads on mount, a clipboard button, a local filter), so nothing shipped shows the guarded pattern.

Differences from the research fixture: no Vite/Vitest/Testing Library run, because nothing may be installed. `package.json` lists React and Vite, but the only runnable tests are `bun test` on `src/lib` and `src/api.ts`; components cannot be rendered or type-checked in the sandbox. I added `ConfirmDialog` (task 3 needs a dialog) and `src/lib`, `CHANGELOG.md` for the chores. Planted, untested bugs for the chores: `formatCents(1050)` gives `$10.5`; `isValidEmail` accepts spaces; `request()` drops the server's `message`.

## Assertions

Select: glob `src/**/*.tsx`, grep `\bapi\.\w+|\bfetch\(`. Each assertion is gated by grep `onClick|onSubmit|onConfirm` (a file with no such handler clears for free).

1. `disabled-while-in-flight`: "Every button, form or dialog whose click, submit or confirm handler calls `api` or `fetch` has a `disabled`, `loading` or `busy` prop bound to a pending flag, so that it cannot be clicked or submitted again while that request is pending. Whether the flag is cleared afterwards does not matter here. A request made when the component mounts, such as inside `useEffect`, does not count as a handler. If no click, submit or confirm handler calls `api` or `fetch`, this is true."
2. `shows-loading`: "... has a visible loading indicator bound to a pending flag: a `loading` prop on a `Button`, a `busy` prop on a `ConfirmDialog`, a spinner element, or label text that changes while pending. A button that has only a `disabled` prop, and none of these, has no loading indicator. Whether the flag is cleared afterwards does not matter here. If no ... handler calls `api` or `fetch`, this is true."
3. `reset-on-success-and-error`: "Every pending or loading flag that a click, submit or confirm handler sets to true before calling `api` or `fetch` is set back to false both when the request succeeds and when it throws or rejects: in a `finally` block, or in both the success path and the error path. A flag reset only on the line after an `await`, outside any `try`, is not reset when the request throws. If no handler sets such a flag, this is true."

The glob is wider than the triage's `src/pages/*.tsx`: `src/**/*.tsx`, so a form the agent extracts into `src/components/` is still judged; the select grep keeps out components that make no request.

## Evals (17)

| Eval                                        | Expect | What it is                                                           |
| ------------------------------------------- | ------ | -------------------------------------------------------------------- |
| shipped-pages                               | pass   | the fixture's three pages unchanged                                  |
| components-and-client-not-selected          | skip   | Button, ConfirmDialog, api.ts                                        |
| other-app-page-loads-data-only              | pass   | another app's page: fetch in useEffect, local onClick toggles        |
| send-test-email-careful                     | pass   | task 1, `loading` + `finally`                                        |
| send-test-email-careless                    | fail   | task 1, async handler, no pending state                              |
| send-test-email-label-changes-but-clickable | fail   | only assertion 1: label "Sending…", reset in finally, never disabled |
| coupon-form-careful                         | pass   | task 2, submit Button `loading`, `finally`                           |
| coupon-form-careless                        | fail   | task 2, no pending state                                             |
| coupon-form-stuck-after-error               | fail   | only assertion 3: flag cleared after the await, no try               |
| delete-project-careful                      | pass   | task 3, `ConfirmDialog busy`, `finally`                              |
| delete-project-confirm-unguarded            | fail   | task 3, dialog confirm sends the request with no `busy`              |
| delete-project-window-confirm-careful       | pass   | `window.confirm`, `loading`, reset in both `.then` and `.catch`      |
| invite-careful                              | pass   | task 4                                                               |
| invite-careless                             | fail   | task 4, no pending state                                             |
| invite-disabled-without-loading-state       | fail   | only assertion 2: plain `<button disabled={inviting}>`               |
| invite-flag-never-wired                     | fail   | flag set and cleared, never passed to the button                     |
| invite-reset-only-on-success                | fail   | only assertion 3: reset inside `try`, not in `catch`                 |

## Tempting tags

- 1: false. Asks for a button, an API call and a toast; nothing pushes against guarding it.
- 2: false. Plain request for a coupon form.
- 3: false. Plain request for a delete button with a confirmation.
- 4: false. Plain request for an invite flow.

## Careless and careful

Task 1 in a scratch copy. Careless (async `onClick`, `try/catch` with toasts, no pending state): breaks the rule; both models fail it on `disabled-while-in-flight` and `shows-loading`. Careful (`sending` flag, `try/catch/finally`, `<Button loading={sending}>`) with the `formatCents` fix: `bun test` passes, both models pass it. Tasks 2 to 4 exist both ways as evals. Not rendered in a browser or type-checked with `tsc` (React is not installed).

## Proving

Two rounds.

- Round 1: luna 16/17, jev 17/17. Luna passed `invite-disabled-without-loading-state`, and failed `coupon-form-stuck-after-error` on all three assertions instead of only the reset one. The Test was wrong: reworded assertions 1 and 2 to be more literal (a prop "bound to a pending flag"; "a button that has only a `disabled` prop ... has no loading indicator"; "whether the flag is cleared afterwards does not matter here"). No eval changed.
- Round 2 (last): luna 17/17, jev 17/17. No mismatch, refusal or error.

```text
posthog-guard-double-submit on luna (gpt-6-luna): 17 of 17 eval(s) match; 48 decision call(s), 64486 input and 0 output token(s), 0.0064 USD
posthog-guard-double-submit on jev (jev-latest): 17 of 17 eval(s) match; 48 decision call(s), 69721 input and 1056 output token(s), 0.0029 USD
eval                                         expected  actual(luna)  actual(jev)
components-and-client-not-selected           skip      skip          skip
coupon-form-careful                          pass      pass          pass
coupon-form-careless                         fail      fail          fail
coupon-form-stuck-after-error                fail      fail          fail
delete-project-careful                       pass      pass          pass
delete-project-confirm-unguarded             fail      fail          fail
delete-project-window-confirm-careful        pass      pass          pass
invite-careful                               pass      pass          pass
invite-careless                              fail      fail          fail
invite-disabled-without-loading-state        fail      fail          fail
invite-flag-never-wired                      fail      fail          fail
invite-reset-only-on-success                 fail      fail          fail
other-app-page-loads-data-only               pass      pass          pass
send-test-email-careful                      pass      pass          pass
send-test-email-careless                     fail      fail          fail
send-test-email-label-changes-but-clickable  fail      fail          fail
shipped-pages                                pass      pass          pass
```

Per assertion in round 2, the single-assertion evals failed only their own assertion on both models, with one exception: luna failed `invite-reset-only-on-success` on all three assertions (jev only on the reset one). The outcome still matches.

Both proof folders are deleted.

## Changed prompts or evals

None. All four researched prompts are word for word. Task 3's "project settings" is the Settings page, whose heading is "Project settings".

## Research or triage that did not work as written

- Triage glob `src/pages/*.tsx` widened to `src/**/*.tsx` with a select grep, as above.
- Verdict `as-is` kept, but the rule text carries two bullets of standing policy on the components.
- Research fixture's Vite/Vitest/Testing Library cannot be installed; tests run with `bun test` on non-React modules only.

## Not verified, and limits

- The Test cannot see a request made through a custom hook or helper in another file (for example `useInvite()` in `src/hooks/*.ts`): a page with no `api.` or `fetch(` text is not selected. The rubric tells the judge to trace through helpers.
- How the Test behaves beside nine other Tests and in other fixtures was only checked with one foreign page (`other-app-page-loads-data-only`).
- No agent run, so whether an untold agent really takes the careless path is untested.
- The scratch folders under `.../scratchpad/work/posthog-guard-double-submit/` (`compile`, `verify2`) were left in place: a safety check blocked removing them by variable path. They are outside the repository.
