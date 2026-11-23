# Guard network-triggering controls against double submission

The console is a React app. In its components, the `.tsx` files under `src/`:

Every button or form that triggers a network request is disabled and shows a loading state while the request is in flight, and is reset on both the success and the error path.

- The console's network requests are the calls on `api` from `src/api.ts`.
- `Button` from `src/components/Button.tsx` takes `loading` and `disabled`: `loading` shows a spinner and also disables the button. `ConfirmDialog` takes `busy`, which disables both of its buttons and shows the spinner on its confirm button.

Loading data when a page mounts is not a button or a form, and neither is a control that only
changes local state, such as opening a dialog, filtering a list or copying text. Where a
confirmation dialog stands in front of a request, the control that triggers it is the dialog's
confirm action, not the button that opens the dialog.
