# Effects that call an API depend only on stable values

The console is a React app. In its hooks and components, the `.ts` and `.tsx` files under `src/`:

A React effect that calls an API must depend only on stable values (primitives, memoised objects or callbacks); an object, array or function created during render must not be in its dependency array, or the request repeats on every render.

- Stable values are primitives, values and setters from `useState`, refs from `useRef`, values from `useMemo` or `useCallback` whose own dependencies are stable, and anything imported or declared outside the component. An effect with no dependency array at all runs after every render, so it breaks the rule too.
- An object, array or function that a hook or component receives as an argument or prop counts as created during render, because callers build them inline: depend on its primitive fields instead.
- `AccountProvider` in `src/context/AccountContext.tsx` builds its value inline on every render, so the object `useAccount()` returns is never stable. The `account` and `setAccount` inside it are the provider's state and are stable.

An effect that makes no network request is not covered, and neither is a dependency array that
leaves a value out: that is a lint question, not this rule's.
