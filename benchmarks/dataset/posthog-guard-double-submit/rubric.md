# Rubric: guard network-triggering controls against double submission

## The rule

Every button or form that triggers a network request is disabled and shows a loading state while the request is in flight, and is reset on both the success and the error path.

- The console's network requests are the calls on `api` from `src/api.ts`.
- `Button` from `src/components/Button.tsx` takes `loading` and `disabled`: `loading` shows a spinner and also disables the button. `ConfirmDialog` takes `busy`, which disables both of its buttons and shows the spinner on its confirm button.

## What to look at

Find every button, form or dialog action the diff adds or changes whose handler ends in a call on
`api` (directly or through a helper or hook). Loading data when a page mounts is not such a
control, and neither is a button that only opens a dialog, copies text or changes local state. For
each control found, trace three things:

1. **Disabled while in flight.** From the moment the request starts until it settles, the control
   cannot fire again: the `Button` gets `loading` or `disabled` from a pending flag, a
   `ConfirmDialog` gets `busy`, a form's submit button is disabled (and the form cannot be
   submitted again by pressing Enter). A pending flag that exists but is wired to nothing does not
   count. An early `return` in the handler while pending, with the control still enabled, is not
   "disabled".
2. **Loading state shown.** The user can see the request is running: `loading` on `Button`, `busy`
   on `ConfirmDialog`, or an equivalent such as a spinner or a label that changes to "Sending…".
   `disabled` alone, with nothing else changing, is guarded but shows no loading state.
3. **Reset on both paths.** The pending flag is cleared when the request succeeds and when it
   throws: in a `finally`, or in both the success and the `catch` branch, or in both callbacks of
   `.then`. `setPending(false)` only after the `await`, with no `try`, leaves the control stuck
   after a failure. A control that leaves the page on success still needs the reset on error.

Where a confirmation dialog stands in front of the request, trace the dialog's confirm action, not
the button that opens it. Then check that every numbered step of the prompt is done: the other
steps (helpers, tests, README, changelog) count only toward whether the task is done, never toward
the rule. Ignore styling, copy and how errors are worded.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the requested control exists but is unguarded or its guard does not work.
- **4 to 6**: the guard is partial: one of the three points above is missing, or one control is
  fully guarded and another is not.
- **7 to 9**: every new network-triggering control meets all three points, with a minor lapse or
  with a step of the task missing or incomplete.
- **10**: every step of the task is done and every new network-triggering control meets all three
  points.

What each looks like:

- **2**: `onClick={async () => { await api.x(); toast.success(...) }}` with no pending state, or
  a pending flag that is set and cleared but never passed to the button or dialog.
- **5**: the button gets `loading` from a flag that is set before the request and cleared after
  the `await`, with no `try`/`finally`, so an error leaves it stuck; or the button is disabled and
  reset correctly but shows no loading state; or a label changes to "Sending…" while the button
  stays clickable.
- **8**: the control is disabled, shows loading and is reset in a `finally`, but a step of the
  task was skipped or left half done, or a hand-built cancel button stays enabled meanwhile.
- **10**: for example `setPending(true); try { await api.x(); toast.success(...) } catch (error)
  { toast.error(...) } finally { setPending(false) }` with `<Button loading={pending}>`, or
  `<ConfirmDialog busy={pending}>`, and every other step of the task done.
