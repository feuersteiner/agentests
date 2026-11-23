# Harbor console

The web console of Harbor, a small hosting service: three pages where a customer manages one
project.

- `src/pages/Settings.tsx`: project settings
- `src/pages/Billing.tsx`: plan and invoices
- `src/pages/Team.tsx`: project members

## Layout

- `src/api.ts`: the client for the Harbor API. Every request goes through `api`.
- `src/components/`: `Button`, `ConfirmDialog` and `toast`.
- `src/lib/`: formatting and validation helpers, with their tests.
- `src/App.tsx`, `src/main.tsx`, `index.html`: the shell and the entry point.

## Working here

Node 18 or later.

```sh
bun test          # unit tests of src/lib and src/api.ts; needs nothing installed
npm install       # only needed to run the app itself
npm run dev
```

Changes that users can see go into `CHANGELOG.md`, under `Unreleased`.
