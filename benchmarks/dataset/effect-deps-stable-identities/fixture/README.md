# Fernhill partner console

The web console Fernhill partners use to look after the customer organizations they resell
Fernhill to. A partner signs in, picks one of their accounts in the header, and sees:

- `src/pages/Dashboard.tsx`: the account's seats in use this month and its organizations
- `src/pages/Members.tsx`: the people who can sign in to the account, filtered by role

## Layout

- `src/api/client.ts`: the client for the Fernhill partner API. Every request goes through it.
- `src/context/AccountContext.tsx`: the account picked in the header, read with `useAccount()`.
- `src/hooks/`: data hooks for the pages. `useOrganizations` is still a stub: the dashboard loads
  its organizations itself for now.
- `src/components/`: the account switcher.
- `src/lib/`: formatting helpers, with their tests.
- `src/App.tsx`, `src/main.tsx`, `index.html`: the shell and the entry point.

## Working here

Node 18 or later.

```sh
bun test          # unit tests of src/lib and src/api; needs nothing installed
npm install       # only needed for the app itself and the linter
npm run dev
npm run lint
```

Changes that partners can see go into `CHANGELOG.md`, under `Unreleased`.
