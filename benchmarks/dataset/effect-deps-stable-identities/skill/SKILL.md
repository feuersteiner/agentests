---
name: effect-deps-stable-identities
description: Use whenever you write or change a React useEffect or useLayoutEffect that fetches data or calls the API in the console's data hooks and pages (src/hooks/*.ts, src/pages/*.tsx), even if the request is only about loading or reloading data, adding a retry, or clearing lint warnings about hook dependencies. Covers what may go in such an effect's dependency array, including values from useAccount(), hook arguments and props.
---

# Effects that call an API depend only on stable values

## The rule

A React effect that calls an API must depend only on stable values (primitives, memoised objects or callbacks); an object, array or function created during render must not be in its dependency array, or the request repeats on every render.

- Stable values are primitives, values and setters from `useState`, refs from `useRef`, values from `useMemo` or `useCallback` whose own dependencies are stable, and anything imported or declared outside the component. An effect with no dependency array at all runs after every render, so it breaks the rule too.
- An object, array or function that a hook or component receives as an argument or prop counts as created during render, because callers build them inline: depend on its primitive fields instead.
- `AccountProvider` in `src/context/AccountContext.tsx` builds its value inline on every render, so the object `useAccount()` returns is never stable. The `account` and `setAccount` inside it are the provider's state and are stable.

## Why

React compares each dependency with the one from the previous render by identity. An object or
function made during render is new every time, so the effect runs again after every render. When
the effect fetches and then sets state, that state change renders again, which builds a new object,
which fetches again: a dashboard that hammers its own API, with every user's tab multiplying the
load. Lint does not catch this: `react-hooks/exhaustive-deps` asks you to list everything the
effect reads, and it cannot see that a context value, an argument or a prop is rebuilt each time.

## How to apply it

- Read the fields you need into primitives before the effect, and list those:
  `const accountId = account.id`, `const { status, page } = options`.
- Build request objects inside the effect from those primitives, not in the component body.
- Move helper functions inside the effect or outside the component. Use `useCallback` only when
  every dependency of the callback is stable too.
- For a list or nested object you cannot split into a few primitives, list a string key such as
  `JSON.stringify(options)` and parse it inside the effect.
- From `useAccount()`, take `account` (or `account.id`) and `setAccount`; never list the object it
  returns.
- When a linter asks for a missing dependency, satisfy it with one of the moves above rather than
  by listing the object or function it names.

## Example

Violating: `options` is an argument, `ctx` is the context object and `toRows` is rebuilt on every
render, so the audit log is fetched again after every render.

```tsx
export function useAuditLog(options: AuditLogOptions) {
  const ctx = useAccount();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const toRows = (events: AuditEvent[]) => events.map(toAuditRow);

  useEffect(() => {
    fetchAuditLog(ctx.account.id, options).then((events) => setRows(toRows(events)));
  }, [ctx, options, toRows]);

  return rows;
}
```

Compliant: the effect lists only primitives, and builds what it needs inside.

```tsx
export function useAuditLog(options: AuditLogOptions) {
  const { account } = useAccount();
  const accountId = account.id;
  const { actor, since } = options;
  const [rows, setRows] = useState<AuditRow[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAuditLog(accountId, { actor, since }, controller.signal).then((events) =>
      setRows(events.map(toAuditRow))
    );
    return () => controller.abort();
  }, [accountId, actor, since]);

  return rows;
}
```

## Before you commit

Open every hook and page you touched and find each effect that makes a request, directly or
through a function it calls. Go through its dependency array entry by entry and ask where each
value comes from: a primitive, state, a ref, an import or a memoised value with stable dependencies
is fine; anything else gets replaced as above. Check again after every change to a dependency
array.
