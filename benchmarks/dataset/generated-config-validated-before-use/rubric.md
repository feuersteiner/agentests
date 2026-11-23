# Rubric: a generated features file is validated before use

## The rule

Code that loads a machine-generated configuration or data file at runtime must validate it (shape, size limits, duplicates) and keep serving with the last known-good version when the new file is invalid, instead of crashing.

- In this service that file is `data/features.json`, the list of request features that `scripts/build-features.ts` generates from the pipeline's export. The service reads it through `src/features/loader.ts`, at startup and whenever it loads it again.
- A valid file is a JSON array of objects in which every field the service uses has the right type, with no more than `MAX_FEATURES` entries (200, from `src/features/limits.ts`) and no two entries with the same `name`.
- An invalid file is logged and rejected whole: none of its entries is used, and the features already in use keep serving. A new list is built and checked on its own and swapped in only once it has passed; a load never empties the list in use or fills it in place.
- A bad file never stops the service: errors from reading, parsing or checking it are caught where the file is loaded and reported through a log line and the loader's return value, never thrown onward or turned into an exit. When the file read at startup is invalid, nothing is in use yet, so the service starts with no features.

## What to look at

Before the diff, `loadFeatures(path)` read the file once at startup, checked that it was an array of at most `MAX_FEATURES` objects with distinct names and a non-empty `name`, `header` and `contains` text each, and returned an empty list, with a log line, for any file that failed. That startup load followed the rule; judge what the diff adds or changes. Read the non-test code under `src/` and follow every path by which a features file is read: the startup load and any watcher, reload function, endpoint, timer or signal handler.

1. **Is the new file checked before use?** On every path: an array, objects, every field the code uses type-checked (a field the diff starts reading, such as a weight, included: a cast, `Number(x)` or `as number` is not a check), the count against `MAX_FEATURES`, duplicate names. A path that parses the file itself and skips the checks breaks the rule there.
2. **Does an invalid file leave the features in use alone?** A watcher or endpoint that assigns `loadFeatures(path)` straight to the features in use swaps in an empty list whenever the new file is bad, because that is what it returns for one; a compliant path checks that the load succeeded (a result flag, an undefined or empty result) and otherwise keeps the old list. Clearing or refilling the live array in place (`length = 0`, `splice`, a module-level preallocated array that each load overwrites) and using part of an invalid file (the entries before the bad one, only the valid ones, the first `MAX_FEATURES`) also break it.
3. **Can a bad file stop the service?** A `throw` or `process.exit` because of the file, or a `JSON.parse` or file read outside a try/catch on a load path, breaks the rule. A loader that throws while every caller catches keeps the service up but breaks the rule's last point: a lapse, not a crash.

Do not grade debouncing, how the reload is triggered, the endpoint's authentication or status codes, or log wording, beyond a rejection being logged. The task's other steps (the scorer's case fix or weights, the log field, the builder, the 405, the variable rename, tests, README, changelog, version) count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a load path swaps in an unchecked, empty or partial list, or throws or exits on a bad file, or the checks are dropped.
- **4 to 6**: one check missing (such as the new field's type or duplicates), or the fallback right on one path and wrong on another, or a throwing loader whose callers all catch.
- **7 to 9**: every path checks the whole file, logs a rejection and keeps the features in use without throwing; a minor lapse, or a step of the task missing.
- **10**: the whole task is done and every load path follows the rule.

What each looks like:

- **2**: `fs.watch(path, () => { features = loadFeatures(path); })`, or an endpoint that does the same and answers 200, so a bad file empties the features; a reload that does `JSON.parse(readFileSync(path, 'utf8')) as Feature[]`; `if (count >= MAX_FEATURES) throw new RangeError(...)` while filling the preallocated array; the live array cleared and refilled while the new file is read.
- **5**: the reload keeps the old list on a bad file but the new `weight` is never type-checked; or the loader now throws a `FeatureFileError` and the watcher catches it; or an oversize file is cut to its first `MAX_FEATURES` entries on one path.
- **8**: every path checks shape, count and duplicates and keeps the old list without throwing, but a step of the prompt (a test, the README, the changelog) is missing, or one rejection is not logged.
- **10**: for example the loader returns a result saying whether the file passed, and the watcher or endpoint swaps the new list in only on success, logs a rejection and keeps serving the old list; or a fresh array preallocated for each load is filled, checked and only then returned. Every other step of the prompt is done.
