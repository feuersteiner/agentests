# Rubric: effects that call an API depend only on stable values

## The rule

A React effect that calls an API must depend only on stable values (primitives, memoised objects or callbacks); an object, array or function created during render must not be in its dependency array, or the request repeats on every render.

- Stable values are primitives, values and setters from `useState`, refs from `useRef`, values from `useMemo` or `useCallback` whose own dependencies are stable, and anything imported or declared outside the component. An effect with no dependency array at all runs after every render, so it breaks the rule too.
- An object, array or function that a hook or component receives as an argument or prop counts as created during render, because callers build them inline: depend on its primitive fields instead.
- `AccountProvider` in `src/context/AccountContext.tsx` builds its value inline on every render, so the object `useAccount()` returns is never stable. The `account` and `setAccount` inside it are the provider's state and are stable.

## The starting code

A React and TypeScript console. `useAccount()` returned `{ account, setAccount }`, built inline by
`AccountProvider`. The dashboard loaded its organizations in its own effect on `[accountId]`
(`accountId = account.id`), and `useOrganizations(filters)` was a stub. `useMembers(query)` passed
its object argument `query` to `fetchMembers` in an effect on `[accountId]`. `useUsage(period)`,
with `period: 'month' | 'year'`, read `session.account.id` (`session = useAccount()`) and called
`toPoints`, an arrow function declared in its body, in an effect on `[period]`. All of it followed
the rule.

## What to look at

Find every `useEffect` or `useLayoutEffect` the diff adds or changes, its dependency array
included, whose callback makes a request: calls `fetch` or a function of `src/api/client.ts`,
directly or through a function it calls. Check every entry of its dependency array:

- Fine: primitives (`accountId`, `account.id`, `status`, a string from `JSON.stringify`), state
  values and setters (objects held in `useState` included), refs, imported functions, constants and
  functions declared outside the component, `account`, `setAccount`, and `useMemo` or
  `useCallback` values whose own dependencies are all fine.
- Breaks the rule: an object or array literal, spread copy or function declared in the component or
  hook body without `useMemo` or `useCallback`; an object, array or function received as an
  argument or prop, such as a `filters`, `query` or `options` argument, even when a caller passes
  state; the object `useAccount()` returns, such as `session` or `accountCtx`; a memoised value whose
  own dependencies hold any of these; and a request-making effect with no dependency array.

Effects that make no request are not graded. Missing dependencies, cleanup, aborting, retry limits
and styling are not this rule. A diff that memoises the provider's value still meets the rule only
through `account`, `setAccount` or primitives, since the rule calls the object `useAccount()`
returns never stable. Where the diff hides how a dependency is defined, use the starting code and
the names the diff shows. The prompt's other steps count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a request-making effect depends on something that breaks the rule. Example, a **2**:
  `[account.id, filters]` with `filters` the hook's argument; `[session, toPoints]` added for the
  linter; or `[load]` with `load` an arrow function in the body.
- **4 to 6**: the rule is followed in one effect and broken in another. Example, a **5**: one hook
  now depends on `[accountId, role, sort]` taken from its argument, another lists `toPoints`.
- **7 to 9**: every request-making effect depends only on stable values, but a step of the task is
  skipped or incomplete, or a refetch it asks for misses one input. Example, an **8**:
  `[account.id, status, plan, search]` from `const { status, plan, search } = filters`, but no
  changelog line.
- **10**: every step is done and every request-making effect depends only on stable values, such
  as `[accountId, status, plan, search]`.
