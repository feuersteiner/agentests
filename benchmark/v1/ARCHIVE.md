# Optional frozen v1 fixtures

The public release asset contains only the historical fixture/case dataset:
fixture repositories, authored tasks, Tests/evals, skills, rubrics and referenced
material. It excludes results, scores, proof/construction reports, unfinished
patches, conversations and run history. The tracked [manifest](archive-manifest.json)
pins its release URL, SHA-256, size and canonical file inventory digest.

Explicit download, verification and hydration from the repository root:

```sh
python3 -B benchmark/v1/archive.py restore
# Equivalent convenience command:
bun --no-env-file run benchmark:restore
```

Python 3.10+ downloads the pinned ZIP only when the ignored local cache is absent,
checks its size and SHA-256, then checks every member and the canonical inventory
before writing ignored `benchmark/v1/workbench/dataset/` paths. The tracked dataset
README is excluded. No environment file or model is used. Changed destination
files, symlinks, non-regular ZIP members, duplicate names and unsafe paths are
rejected before extraction. Repeating restore preserves existing identical files.
A failed download never installs a partial cache. Normal checks, help and pilot
selection never hydrate or access the private repository.

## Offline reconstruction and verification

The ZIP uses stored entries with sorted paths, fixed timestamps and Unix modes;
its digest does not depend on compression-library versions. The pinned historical
Git commit can reconstruct exactly the same fixture-only asset offline:

```sh
python3 -B benchmark/v1/archive.py rebuild
python3 -B benchmark/v1/archive.py verify
python3 -B benchmark/v1/archive-test.py
```

Rebuild requires the source objects identified in the manifest. A shallow clone
can explicitly obtain them with `git fetch origin <source-commit>`, or use the
release download instead. An inspection restore can use `--destination` with an
external physical directory (resolve macOS `/tmp`/`/var` aliases first). Existing
historical defects remain unchanged; hydration does not establish proof validity.

Evidence and construction history have a separate [private workflow](../EVIDENCE.md).
Existing public Git history remains unchanged; removing loose fixtures from this
checkout does not remove historical Git objects.
