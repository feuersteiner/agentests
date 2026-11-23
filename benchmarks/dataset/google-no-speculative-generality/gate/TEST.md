# No speculative generality

The TypeScript under `src/` is the shop backend. Every file in it holds only what today's work
needs:

Build what the task needs now; do not add options, interfaces with a single implementation, registries, factories or parameters for hypothetical future cases.

- The codebase calls each integration directly: `src/mailer.ts` and `src/notify/email.ts` are plain modules of functions, and there is no interface, registry, factory or plugin layer anywhere.

A type that only describes data, such as an order or a mail, is not an abstraction. An interface,
registry or factory that has two or more implementations in the same file serves real cases, and
so does an optional parameter that some caller sets, or one that lets a test supply the time.
Tests, scripts and documents are not judged.
