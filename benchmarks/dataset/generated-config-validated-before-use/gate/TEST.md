# A generated features file is validated before use

The TypeScript code under `src/` that reads, checks, reloads or swaps in the features file, `data/features.json`:

Code that loads a machine-generated configuration or data file at runtime must validate it (shape, size limits, duplicates) and keep serving with the last known-good version when the new file is invalid, instead of crashing.

- In this service that file is `data/features.json`, the list of request features that `scripts/build-features.ts` generates from the pipeline's export. The service reads it through `src/features/loader.ts`, at startup and whenever it loads it again.
- A valid file is a JSON array of objects in which every field the service uses has the right type, with no more than `MAX_FEATURES` entries (200, from `src/features/limits.ts`) and no two entries with the same `name`.
- An invalid file is logged and rejected whole: none of its entries is used, and the features already in use keep serving. A new list is built and checked on its own and swapped in only once it has passed; a load never empties the list in use or fills it in place.
- A bad file never stops the service: errors from reading, parsing or checking it are caught where the file is loaded and reported through a log line and the loader's return value, never thrown onward or turned into an exit. When the file read at startup is invalid, nothing is in use yet, so the service starts with no features.

Code under `src/` that never reads the features file, or only uses features it is given, such as the scorer, is not covered.
