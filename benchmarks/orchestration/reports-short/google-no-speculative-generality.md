# google-no-speculative-generality

Status: done. Entry at `benchmarks/dataset/google-no-speculative-generality/`. `loadEntry` passes, `validate` passes with the final gate in a fresh fixture copy, the fixture's tests pass (`npm test`, 7 tests, Node 22 running TypeScript directly), no caches left, proof folders deleted.

## Rule text

> Build what the task needs now; do not add options, interfaces with a single implementation, registries, factories or parameters for hypothetical future cases.
>
> - The codebase calls each integration directly: `src/mailer.ts` and `src/notify/email.ts` are plain modules of functions, and there is no interface, registry, factory or plugin layer anywhere.

## Fixture

`fernhill-shop`, the order backend of a fictional coffee roaster: `src/mailer.ts`, `src/notify/email.ts`, `src/catalog.ts`, `src/orders/{types,checkout,fulfilment,report}.ts`, `src/cli/report.ts`, `test/{checkout,fulfilment,report}.test.ts`, `data/{catalog,orders}.json`, README, CHANGELOG, package.json, tsconfig.json, .gitignore. Seeded chores for the other steps: README names the wrong test command (`npm run tests`), report revenue counts cancelled orders, "Revnue" typo, "it's way" typo, `shipIt` to rename, checkout accepts quantity <= 0.

## Assertions (select glob `src/**/*.ts`)

1. `no-single-implementation-interface`
   - grep: `\binterface\b|\babstract\s+class\b|\bimplements\b|\btype\s+\w+(<[^>]*>)?\s*=`
   - decide: "Every interface, abstract class or type in this file that declares methods or function-typed members has at least two implementations in this file, that is, two classes or objects that provide those methods. A file whose interfaces and types only describe data fields satisfies this."
2. `no-single-case-registry-or-factory` (no grep)
   - decide: "This file contains no registry, factory, strategy or plugin layer that serves fewer than two implementations. Such a layer is a map, object or list made to hold interchangeable handlers, channels, formats, rules or providers that code registers into, loops over or looks up by a key, or a function or class that chooses or constructs an implementation from a name, kind or type argument. A file that calls its functions directly, a cache of data, and a layer that holds two or more implementations in this file all satisfy this."
3. `no-unset-option`
   - grep: `process\.env[^;\n]*(\?\?|\|\|)|[(,{]\s*\w+\s*(:[^,()={};\n]+)?=[^=>]|\w\?\s*:`
   - decide, two alternatives (the second is the real exception, a time parameter for tests):
     - "Every optional parameter, every parameter default and every optional field of an options or config type in this file is given a different value by at least one call in this file, and the file never reads an environment variable with a fallback value, as in `process.env.NAME ?? value` or `process.env.NAME || value`. A file with none of these satisfies this; a default that no call in this file overrides does not. Optional or nullable fields of a type that describes data, such as a customer, an order or a product, do not count."
     - "The only optional or defaulted parameters in this file exist so that tests can supply the current time, the file declares no options or config type with optional fields, and it never reads an environment variable with a fallback value, as in `process.env.NAME ?? value` or `process.env.NAME || value`."

## Evals (19)

| eval                           | expects | what it is                                                                                    |
| ------------------------------ | ------- | --------------------------------------------------------------------------------------------- |
| shipped-fixture                | pass    | the fixture's src/ and test/ unchanged                                                        |
| sms-sent-directly              | pass    | task 1 careful: one function posting to Twilio, called from fulfilment                        |
| sms-channel-registry           | fail    | task 1 careless: channel interface, registry, one channel (assertions 1 and 2)                |
| sms-interface-one-sender       | fail    | only assertion 1: SmsSender interface with one class, no registry                             |
| csv-written-directly           | pass    | task 2 careful: toCsv plus the command writing the file                                       |
| csv-format-registry            | fail    | only assertion 2: a format map with one entry, no interface                                   |
| csv-delimiter-options          | fail    | only assertion 3: CsvOptions nobody sets                                                      |
| discount-as-constants          | pass    | task 3 careful                                                                                |
| discount-rule-engine           | fail    | task 3 careless: DiscountRule interface, one rule in a list                                   |
| discount-configurable          | fail    | only assertion 3: CheckoutOptions with threshold, rate, currency                              |
| cache-in-module                | pass    | task 4 careful: module-level value, load time, constant                                       |
| cache-generic-class            | fail    | task 4 careless (the one I built in scratch): Cache interface, TtlCache, createCache, options |
| cache-ttl-from-env             | fail    | only assertion 3: TTL from an env var with a fallback                                         |
| cache-time-passed-in-for-tests | pass    | `now = Date.now()` parameter for tests                                                        |
| interface-with-two-carriers    | pass    | interface and lookup with two implementations in the file                                     |
| default-overridden-in-file     | pass    | default parameter that a call in the file overrides                                           |
| address-data-types             | pass    | selected file about something else, data-only interfaces                                      |
| date-helpers                   | pass    | selected file about something else, plain functions                                           |
| tests-and-docs-not-selected    | skip    | test/, docs/, scripts/ holding interfaces and factories                                       |

## Tempting tags

- 1: false. Asks for an SMS on shipping and names the API and credentials; nothing pushes toward a channel layer.
- 2: false. Asks for one format to one path.
- 3: false. One discount with fixed numbers.
- 4: false. One cache with a fixed duration.

## Careless and careful (task 4, in scratch)

- Careful: renamed `shipIt`, added the decaf and its test, cached the catalogue as a module-level value with a five-minute constant, fixed the README, added changelog lines. 8 tests pass. Its `src/catalog.ts` is the `cache-in-module` eval and passes on both models.
- Careless: a `src/cache.ts` with `CacheOptions`, a `Cache<T>` interface, `TtlCache<T>` and `createCache`, used once from `catalog.ts`. Tests still pass (7), and it breaks the rule three ways. It is the `cache-generic-class` eval and fails on both models.

## Proving rounds: 5

1. First run. luna 16/19, jev 15/19. All misses on assertion 3 (one compound criterion with its exceptions inline): env TTL and configurable discount passed, the clock parameter failed on luna, the direct SMS file failed on jev.
2. Assertion 3: narrowed the grep to real defaults, optional markers and env fallbacks (it had also matched every `||`, `process.env`, and, through a type body spanning lines, most files); reworded the criterion to "every ... is given a different value by at least one call"; moved the test-clock exception into its own alternative. luna 19/19, jev 18/19 (cache-ttl-from-env passed).
3. Reworded both alternatives as "leaves no setting at its default" with the literal `process.env.NAME ?? value` form. Worse: luna 17/19, jev 18/19 (default-overridden-in-file failed on both, clock failed on luna).
4. Went back to round 2's wording and kept only the literal env-fallback phrase. luna 19/19, jev 18/19 (discount-configurable passed).
5. Added "a default that no call in this file overrides does not" to the first alternative. luna 19/19, jev 19/19. Frozen.

No eval was changed, flipped or deleted during proving. `cache-generic-class` was added before round 1, from the careless scratch run.

### Last round

luna (gpt-6-luna): 19 of 19 match; 63 decision calls, 68058 input and 0 output tokens, 0.0068 USD.
jev (jev-latest): 19 of 19 match; 62 decision calls, 74961 input and 1364 output tokens, 0.0031 USD.

| eval                           | expected | luna | jev  |
| ------------------------------ | -------- | ---- | ---- |
| address-data-types             | pass     | pass | pass |
| cache-generic-class            | fail     | fail | fail |
| cache-in-module                | pass     | pass | pass |
| cache-time-passed-in-for-tests | pass     | pass | pass |
| cache-ttl-from-env             | fail     | fail | fail |
| csv-delimiter-options          | fail     | fail | fail |
| csv-format-registry            | fail     | fail | fail |
| csv-written-directly           | pass     | pass | pass |
| date-helpers                   | pass     | pass | pass |
| default-overridden-in-file     | pass     | pass | pass |
| discount-as-constants          | pass     | pass | pass |
| discount-configurable          | fail     | fail | fail |
| discount-rule-engine           | fail     | fail | fail |
| interface-with-two-carriers    | pass     | pass | pass |
| shipped-fixture                | pass     | pass | pass |
| sms-channel-registry           | fail     | fail | fail |
| sms-interface-one-sender       | fail     | fail | fail |
| sms-sent-directly              | pass     | pass | pass |
| tests-and-docs-not-selected    | skip     | skip | skip |

No refusals, no errors.

## Task prompts and evals changed

None. All four researched prompts are used word for word.

## Research and triage notes

- The research scope is `cross-file`; the triage's single-file reading is what the Test implements. Its two noted limits hold: an interface in a file of its own fails even if a second file implements it twice, and an unused option is only visible with its callers in the same file.
- I added one exception the triage does not name: a defaulted parameter that lets tests supply the current time passes (second alternative of assertion 3, eval `cache-time-passed-in-for-tests`). The rule bans parameters for hypothetical cases, and a test seam is a present one. The gate cannot see whether a test uses it; the rubric tells the judge to treat it as a knob when no test in the diff does.
- Assertion 3 fails every environment variable read with a fallback (`process.env.X ?? value`), since nothing in the file can set another value. In another entry's fixture, a `src/**/*.ts` file with such a fallback, or with a default parameter no call in that file overrides, will be blocked by this Test. The grep keeps files without those constructs away from the model.
- A generic class with only required parameters and one use (say `new TtlCache<T>(300000)`, no interface, no factory) is not caught by any assertion; the rule text does not list it and three assertions were spent. The rubric covers it for the judge.

## Not verified

- No agent run was made, so whether the skill's description gets it loaded beside nine others, and how often an untold agent over-builds these tasks, is untested.
- Assertion 3 on jev moved between rounds with small wording changes (rounds 2 to 5), so it is the least stable part of the Test; each round was a single run per eval.
- The Test was not run against other entries' fixtures (they were being built at the same time).
- `tsc` is not installed, so the fixture's `tsconfig.json` was not type-checked; the code runs under Node 22's type stripping.
