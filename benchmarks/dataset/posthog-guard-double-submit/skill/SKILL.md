---
name: posthog-guard-double-submit
description: Use whenever you add or change a button, form, dialog action or other control in the console's React pages (src/pages/*.tsx) that makes a request through api when it is clicked or submitted, such as save, send, delete, apply or invite actions, even if the request only asks for "a button that calls the API". Covers the pending state of such controls, disabling them and showing loading while the request runs, and resetting them when it succeeds or fails.
---

# Guard network-triggering controls against double submission

## The rule

Every button or form that triggers a network request is disabled and shows a loading state while the request is in flight, and is reset on both the success and the error path.

- The console's network requests are the calls on `api` from `src/api.ts`.
- `Button` from `src/components/Button.tsx` takes `loading` and `disabled`: `loading` shows a spinner and also disables the button. `ConfirmDialog` takes `busy`, which disables both of its buttons and shows the spinner on its confirm button.

## Why

A request takes a moment, and users click again when nothing seems to happen. An unguarded
control then sends the request twice: two emails, two charges, two invitations, or a second
delete that fails with a confusing error. A control whose pending flag is cleared only on success
is the opposite failure: one network error leaves it disabled until the page is reloaded.

## How to apply it

For every control whose handler calls `api`:

1. Keep a pending flag in state, one per control.
2. Set it before the request starts and clear it in a `finally`, so it is cleared whether the
   request resolves or throws.
3. Pass it to the control: `loading` on a `Button`, `busy` on a `ConfirmDialog`. In a form, put it
   on the submit button; a disabled submit button also stops a second submit with Enter.
4. Report the outcome on both paths, for example with `toast.success` and `toast.error`.

Common slips:

- `onClick={async () => { await api.save(x); toast.success('Saved') }}`: no pending state at all.
- A pending flag that is set and cleared but never passed to the control.
- `setSaving(false)` on the line after the `await`, with no `try`: skipped when the request throws.
- `disabled={saving}` on a plain `<button>` with nothing that shows the request is running.
- Guarding the button that opens a confirmation dialog, but not the dialog's confirm action, which
  is the one that sends the request.

## Example

Violating: the flag is never wired to the button, and an error leaves it set.

```tsx
const [saving, setSaving] = useState(false);

async function rename() {
  setSaving(true);
  await api.renameProject(name);
  toast.success('Project renamed');
  setSaving(false);
}

<Button onClick={rename}>Rename</Button>;
```

Compliant: disabled with a spinner while the request runs, and reset on both paths.

```tsx
const [saving, setSaving] = useState(false);

async function rename() {
  setSaving(true);
  try {
    await api.renameProject(name);
    toast.success('Project renamed');
  } catch (error) {
    toast.error(describeError(error));
  } finally {
    setSaving(false);
  }
}

<Button loading={saving} onClick={rename}>
  Rename
</Button>;
```

## Before you commit

Open every page you touched and list the controls whose handlers call `api`. For each one, check
that it is disabled while the request runs, that it shows loading, and that the flag is cleared
when the request fails as well as when it succeeds. Fix what is missing and check again.
