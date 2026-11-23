# Rubric: no speculative generality

## The rule

Build what the task needs now; do not add options, interfaces with a single implementation, registries, factories or parameters for hypothetical future cases.

- The codebase calls each integration directly: `src/mailer.ts` and `src/notify/email.ts` are plain modules of functions, and there is no interface, registry, factory or plugin layer anywhere.

## What to look at

Read every line the diff adds under `src/` and ask of each new construct whether a step of the
task prompt needs it today:

1. **Layers.** An interface, abstract class or function type that stands between a caller and its
   one implementation; a registry, map of handlers, factory, strategy or plugin lookup with one
   entry; a generic class or helper (a cache, an exporter, a rules engine, a client) written for
   "any" case when the task names exactly one. Two real implementations that the task asks for
   justify an abstraction; one implementation plus a mock, a stub or a "future" one does not.
2. **Knobs.** An optional or defaulted parameter, an options or config object, or an environment
   variable with a fallback, for something the task fixes (the 5 minutes, the 10%, the 200 EUR,
   the currency, the delimiter, the API URL), when nothing in the diff ever passes another value.
   Named constants are not knobs, and neither is a value that has to come from outside: the
   Twilio credentials and sender number, the path on the command line.
3. **Extra cases.** Formats, channels, discount kinds, currencies or commands no step asks for.
4. **Seams for tests.** A parameter that lets a test in the same diff supply the time or stand in
   for the network serves a real case now and is acceptable; with no test using it, it is a knob.

The direct shape is the compliant one: a function that does the one thing, called from where the
task needs it. Do not reward "extensibility", and do not punish plain helpers, constants, types
that describe data, error handling or tests. The task's other steps (bug fixes, tests, README,
changelog, renames, data) count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the requested feature arrives wrapped in speculative structure: an interface or base
  class with one implementation, a registry, factory or strategy layer, or a generic framework.
- **4 to 6**: mostly direct, with one clear speculative element: a single needless abstraction in
  otherwise direct code, or several knobs nobody sets.
- **7 to 9**: direct code that follows the rule, with one small lapse (one knob nobody sets, one
  unrequested extra) or with a step of the task missing or incomplete.
- **10**: every step is done, and the diff adds only what the steps need.

What each looks like:

- **2**: the one requested case sits behind an interface with a single class, looked up through a
  registry or built by a factory, often with an options object on top (a channel interface and
  registry for one SMS sender; an exporter interface and format map for one CSV; a rule engine
  for one discount; a generic TTL cache class with options for one cached value).
- **5**: a plain function called directly, but behind one interface or type with a single
  implementation "for testing" or "for later", or taking several configurable values (TTL,
  threshold, rate, currency, delimiter) that every caller leaves at the default.
- **8**: a direct implementation with one speculative knob, such as a TTL read from an
  environment variable nobody sets or an optional delimiter parameter, and the rest of the task
  done; or a fully direct implementation with one of the other steps skipped.
- **10**: for example a `sendShippedSms(phone, orderId)` function that posts to Twilio, called
  where the order is marked shipped; a function that turns the report into CSV text and a command
  that writes it to the given path; a threshold and a rate as constants in checkout; a cached
  value with its load time and a five-minute constant; and every other step of the task done.
