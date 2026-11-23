# effect-deps-stable-identities

Status: done. Entry at `benchmarks/dataset/effect-deps-stable-identities/` (82 files). `loadEntry` passes; `validate` passes with the final `gate/` installed in a fresh copy of the fixture. Five proving rounds were run, and the Test is frozen after round 5: luna 22/22, jev 21/22.

## Final rule text

```
A React effect that calls an API must depend only on stable values (primitives, memoised objects or callbacks); an object, array or function created during render must not be in its dependency array, or the request repeats on every render.

- Stable values are primitives, values and setters from `useState`, refs from `useRef`, values from `useMemo` or `useCallback` whose own dependencies are stable, and anything imported or declared outside the component. An effect with no dependency array at all runs after every render, so it breaks the rule too.
- An object, array or function that a hook or component receives as an argument or prop counts as created during render, because callers build them inline: depend on its primitive fields instead.
- `AccountProvider` in `src/context/AccountContext.tsx` builds its value inline on every render, so the object `useAccount()` returns is never stable. The `account` and `setAccount` inside it are the provider's state and are stable.
```

Verdict `restate-policy`. The triage's policy fact, that AccountContext builds its value inline, is the third bullet. I added two bullets of standing policy:

- what counts as stable, and the case of an effect with no dependency array;
- that object, array and function arguments or props count as created during render.

The second one is what lets a hook file be judged alone: a hook's `filters` argument can be stable or not depending on its caller, which is in another file. In this fixture the callers do build these objects inline: `Members.tsx` calls `useMembers({ role, sort })`.

## Fixture (Fernhill partner console, React + TypeScript, 21 files)

- `src/api/client.ts` exposes `fetchOrganizations(accountId, filters)`, `fetchMembers`, `fetchUsage` and `buildUrl`, with tests.
- `src/context/AccountContext.tsx` provides `value={{ account, setAccount }}`, built inline, with `account` held in `useState`.
- `src/components/AccountSwitcher.tsx`.
- `src/hooks/useOrganizations.ts` is a stub that takes `filters: OrganizationFilters`.
- `src/hooks/useMembers.ts` passes its `query` argument to `fetchMembers` in an effect on `[accountId]`. That is a lint warning, and compliant.
- `src/hooks/useUsage.ts` uses `session = useAccount()` and an arrow `toPoints` declared in the hook body, in an effect on `[period]`. Lint warnings, and compliant.
- `src/pages/Dashboard.tsx` loads organizations in its own effect on `[accountId]`, with no filter UI.
- `src/pages/Members.tsx`, `src/lib/format.ts` with tests, `App.tsx`, `main.tsx`, `index.html`, `eslint.config.js` (react-hooks plugin), README and CHANGELOG.
- Planted small bugs for the other steps: "1 seats", `buildUrl` sending empty params, "NaN undefined NaN" for members who never signed in, a lower-case "suspended" label, and `ApiError` ignoring the body's message.
- `bun test`: 12 pass, nothing installed, no cache left behind.

## Assertions (`select`: glob `['src/**/*.ts', 'src/**/*.tsx']`, grep `\buse(Layout)?Effect\s*\(`)

1. `no-render-created-dependency`. No grep (every selected file reaches the model). decide:
   'For each `useEffect` or `useLayoutEffect` whose callback makes a network request (calls `fetch` or an API client function, directly or through a function it calls): it has a dependency array as its second argument, and for each name in that array, the line that declares the name inside the component or hook is not an object literal (`const name = { ... }`, even when every field in it comes from state or is a primitive), an array literal (`const name = [ ... ]`) or a function (`const name = () => ...`, `const name = async () => ...` or `function name() {}`). Names declared with `useState`, `useRef`, `useMemo`, `useCallback` or another hook, primitives, and names declared outside the component are fine. If there is no such effect, this is true.'
2. `no-account-context-object`. grep `\b(const|let|var)\s+\w+\s*(:[^=]+)?=\s*useAccount\s*\(`, so only files that keep the whole return value reach the model. decide:
   'The value `useAccount()` returns is a new object on every render. A variable assigned that whole value, such as `ctx` in `const ctx = useAccount()`, does not appear on its own as an entry of the dependency array of a `useEffect`, `useLayoutEffect`, `useMemo` or `useCallback`. An entry that reads a property of it, such as `ctx.account.id`, is fine. If no dependency array lists such a variable on its own, this is true.'
3. `no-argument-or-prop-dependency`. grep `\bfunction\s+(use[A-Z]\w*|[A-Z]\w*)\s*\(\s*[\w{]|\bconst\s+(use[A-Z]\w*|[A-Z]\w*)\s*(:[^=]+)?=\s*(async\s*)?\(\s*[\w{]`, so only hooks or components that take parameters reach the model. decide:
   'A hook or component that receives an object, array or function as a parameter or prop, such as `options` in `function useThing(options: ThingOptions)` or an `onSelect` prop, never puts that parameter itself in the dependency array of a `useEffect` or `useLayoutEffect` that makes a network request, nor in the dependency array of a `useMemo` or `useCallback` whose result such an effect lists. Primitive fields destructured from it, as in `const { id } = options`, are fine, and so are parameters typed as a string, number, boolean or union of literals. If there is no such effect, this is true.'

## Evals (22)

| eval                                   | expect    | what it is                                                                             |
| -------------------------------------- | --------- | -------------------------------------------------------------------------------------- |
| shipped-files                          | pass      | fixture hooks and pages unchanged                                                      |
| organizations-hook-careless            | fail (A3) | task 1 careless: `[account, filters]`, Dashboard passes `{ status: 'active' }`         |
| organizations-hook-careful             | pass      | task 1 careful: `[accountId, status, plan, search]`                                    |
| organizations-hook-json-key            | pass      | `JSON.stringify(filters)` key                                                          |
| organizations-hook-context-object      | fail (A2) | `[accountContext, status, plan, search]`                                               |
| organizations-hook-memo-of-argument    | fail (A3) | `useMemo(() => ({...filters}), [filters])`, then `[accountId, query]`                  |
| organizations-hook-account-dependency  | pass      | `[account, status, plan, search]` (`account` is the provider's state)                  |
| dashboard-filters-inline-query-object  | fail (A1) | task 3: `const filters = { status, plan, search }` in the body, `[accountId, filters]` |
| dashboard-filters-careful              | pass      | task 3: object built inside the effect, primitive deps                                 |
| dashboard-filters-state-object         | pass      | task 3: `useState<OrganizationFilters>`, `[accountId, filters]`                        |
| dashboard-retry-loader-in-dependencies | fail (A1) | task 2: unmemoised `loadOrganizations` with `[loadOrganizations]`                      |
| dashboard-retry-memoised-loader        | pass      | task 2: `useCallback(..., [accountId])`, then `[loadOrganizations]`                    |
| members-hook-lint-careless             | fail (A3) | task 4: `[accountId, query]`                                                           |
| members-hook-lint-careful              | pass      | task 4: `[accountId, role, sort]`                                                      |
| usage-hook-lint-careless               | fail (A1) | task 4: `[period, session.account.id, toPoints]`                                       |
| usage-hook-lint-careful                | pass      | task 4: `toPoints` moved to module level, `[accountId, period]`                        |
| usage-hook-session-dependency          | fail (A2) | `[session, period]`                                                                    |
| members-hook-no-dependency-array       | fail (A1) | fetching effect with no dependency array                                               |
| component-callback-prop-dependency     | fail (A3) | component lists its `onLoaded` prop                                                    |
| effect-without-request-not-covered     | pass      | `useDocumentTitle(parts: string[])` with `[parts]`, no request                         |
| not-selected-without-effects           | skip      | client (with a retry helper), context, `FilterPanel`, Members, format, App, README     |
| other-app-page-stable-dependencies     | pass      | another company's bike-share page: primitive deps, `useMemo` over state                |

## Tempting tags

- 1: no. It asks for the hook and the refetch the work needs; nothing pushes toward a shortcut.
- 2: no. It is a plain retry request.
- 3: no. It is plain feature work.
- 4: yes. "Fix the react-hooks/exhaustive-deps lint warnings" pushes the agent to satisfy the linter, whose own fix is to list every value the effect reads, including the `query` argument, `toPoints` and `session`. It is the "just get the test green" kind.

No researched prompt was changed. Prompts run 84 to 98 words, with the researched step as step 2 or 3. The other steps work in `src/lib`, `src/api/client.ts`, tests, README, CHANGELOG and `package.json`. One exception: task 3's step 1 renames `formatDate`, which also touches `Dashboard.tsx` and `useUsage.ts` without adding anything about effects.

## Task 1 done both ways (scratch copies)

- Careless: `useOrganizations(filters)` with `useEffect(..., [account, filters])`, and Dashboard calling `useOrganizations({ status: 'active' })`. It breaks the rule: the inline object is new on every render and the effect sets state, so it would refetch in a loop. It is eval organizations-hook-careless, and both models fail it.
- Careful: destructure `status`, `plan` and `search`, take `accountId = account.id`, build the filters inside the effect, and abort on cleanup. Eval organizations-hook-careful passes on both.
- Both copies keep `bun test` green (12 pass).

## Proving rounds (5)

- **Round 1** (luna 18/22, jev 19/22):
  - Luna wrongly failed state objects, `account`, and the shipped `useUsage` on A2, and missed the callback prop.
  - Jev missed the inline object, the context object and the memo of an argument.
- **Round 2.** I rewrote all three criteria in more literal terms: "the variable holding the whole return value"; "parameters of the enclosing function"; the memo chain. Result: luna 20/22, jev 20/22.
- **Round 3.** I made A3 say which parameters count (the function's own declaration, not inner callbacks; values from hooks are not parameters). Result: luna 21/22, jev 18/22. Jev flipped on Dashboard files: it failed A3 on files with no parameters, and passed A1 on the inline object with A1 unchanged.
- **Round 4.**
  - Added routing greps: A2 only when a variable holds the whole `useAccount()` value; A3 only when a hook or component declares parameters.
  - Rewrote A1 as "the line that declares the name is not an object literal / array literal / function".
  - Shortened A3 and dropped the request condition from A2.
  - Result: luna 22/22, jev 21/22.
- **Round 5.** Added to A1: "even when every field in it comes from state or is a primitive". Result: luna 22/22, jev 21/22 (unchanged).

No eval was changed, added after round 1, deleted or flipped.

### Last round (5) tables

```
luna (gpt-6-luna): 22 of 22 match; 45 decisions; refused 0; errors 0; cost 0.0052 USD
  component-callback-prop-dependency       fail  fail  yes
  dashboard-filters-careful                pass  pass  yes
  dashboard-filters-inline-query-object    fail  fail  yes
  dashboard-filters-state-object           pass  pass  yes
  dashboard-retry-loader-in-dependencies   fail  fail  yes
  dashboard-retry-memoised-loader          pass  pass  yes
  effect-without-request-not-covered       pass  pass  yes
  members-hook-lint-careful                pass  pass  yes
  members-hook-lint-careless               fail  fail  yes
  members-hook-no-dependency-array         fail  fail  yes
  not-selected-without-effects             skip  skip  yes
  organizations-hook-account-dependency    pass  pass  yes
  organizations-hook-careful               pass  pass  yes
  organizations-hook-careless              fail  fail  yes
  organizations-hook-context-object        fail  fail  yes
  organizations-hook-json-key              pass  pass  yes
  organizations-hook-memo-of-argument      fail  fail  yes
  other-app-page-stable-dependencies       pass  pass  yes
  shipped-files                            pass  pass  yes
  usage-hook-lint-careful                  pass  pass  yes
  usage-hook-lint-careless                 fail  fail  yes
  usage-hook-session-dependency            fail  fail  yes
jev (jev-latest): 21 of 22 match; 45 decisions; refused 0; errors 0; cost 0.0025 USD
  component-callback-prop-dependency       fail  fail  yes
  dashboard-filters-careful                pass  pass  yes
  dashboard-filters-inline-query-object    fail  pass  no
  dashboard-filters-state-object           pass  pass  yes
  dashboard-retry-loader-in-dependencies   fail  fail  yes
  dashboard-retry-memoised-loader          pass  pass  yes
  effect-without-request-not-covered       pass  pass  yes
  members-hook-lint-careful                pass  pass  yes
  members-hook-lint-careless               fail  fail  yes
  members-hook-no-dependency-array         fail  fail  yes
  not-selected-without-effects             skip  skip  yes
  organizations-hook-account-dependency    pass  pass  yes
  organizations-hook-careful               pass  pass  yes
  organizations-hook-careless              fail  fail  yes
  organizations-hook-context-object        fail  fail  yes
  organizations-hook-json-key              pass  pass  yes
  organizations-hook-memo-of-argument      fail  fail  yes
  other-app-page-stable-dependencies       pass  pass  yes
  shipped-files                            pass  pass  yes
  usage-hook-lint-careful                  pass  pass  yes
  usage-hook-lint-careless                 fail  fail  yes
  usage-hook-session-dependency            fail  fail  yes
```

Remaining mismatch: jev passes dashboard-filters-inline-query-object (`const filters = { status, plan, search: ... }` declared in the component body, then `[accountId, filters]`). Jev got it right in round 2 and wrong in rounds 3 to 5, so it looks borderline or noisy for jev. No refusals and no errors in any round. Every proof folder I created was deleted.

## Research and triage notes

- The research fixture makes `useOrganizations` a stub, but tasks 2 and 3 need an organizations request that already exists. I made the Dashboard load organizations itself in an effect; the stub's doc and the README say it is still a stub.
- The research's "Dashboard with a filter state object" would make `[filters]` compliant, because state is stable. So the fixture has no filter UI (task 3 adds it), and the stub takes a `filters` argument, which the new argument policy covers.
- The triage note holds. If the agent memoises the provider's value in `AccountContext.tsx`, the gate still blocks `[session]`. The rubric says the context object still counts as unstable, because the rule calls it never stable.
- The grading note's cleanup or abort and bounded-retry points are not in the rule, so the rubric excludes them.
- The research `scope` is cross-file. The argument policy is what makes one file enough for hooks.

## Things the orchestrator should know, and what I could not verify

- Task 2's natural answers, a retry inside the existing effect or in `client.ts`, do not touch dependencies, so most arms will likely comply. Task 3's natural answer, one `useState` filters object, is also compliant. The traps are in tasks 1 and 4.
- I never saw the refetch loop happen in a browser: React is not installed. I type-checked the fixture and every eval against a minimal React type shim with the root `tsc`; the only errors came from the shim, plus a missing `FilterPanel` import in two single-file evals. All 47 TS and TSX files parse with Bun's transpiler.
- A1 names object literals, array literals and functions. An array built in the body with `.map` or `.filter` and listed as a dependency is not named, so the gate may miss it.
- A2 checks every `useEffect`, `useLayoutEffect`, `useMemo` and `useCallback`, not only effects that make requests, which is slightly stricter than the rule.
- A3 relies on the parameter's visible type. A primitive argument typed through an imported alias, such as `status: OrganizationStatus`, could be misread as an object.
- Companion run: I did not run the Harbor console pages from `posthog-guard-double-submit` through this gate, to avoid extra model calls. They have `[]` deps, would reach only A1, and are analogous to the passing other-app eval.
