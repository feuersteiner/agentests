# Private benchmark evidence

Results, measured scores, invocation settings, logs, transcripts, conversations,
historical handoffs, construction reports and unfinished patches are versioned in
[feuersteiner/agentests-benchmark-evidence](https://github.com/feuersteiner/agentests-benchmark-evidence),
a private Git repository with Git LFS archives. Public sources contain methods,
code, test definitions and fixture manifests only.

A normal clone does not initialize the optional `benchmark/private` submodule.
Authorized collaborators can fetch it explicitly from the repository root:

```sh
git lfs install
git submodule update --init benchmark/private
git -C benchmark/private lfs pull
```

Private `docs/` contains historical summaries and handoffs. `manifests/v1/`
records per-file original/export SHA-256 values, sizes, credential redactions and
omissions; `archives/v1/` contains one ZIP per invocation or conversation/history
batch, tracked with LFS. Local raw originals remain ignored and untouched under
`benchmark/v1/results/`. The private archives preserve sanitized upload copies.
Original source hashes allow comparison without publishing credential values.
Do not treat a sanitized archive as an executable workspace.

## Future runs

The v2 runner writes ignored `benchmark/v2/results/raw/<run-id>/`. Maintenance
never runs models. After a separately authorized run, package one batch explicitly:

```sh
python3 -B benchmark/evidence.py benchmark/v2/results/raw/<run-id> \
  --version v2 --batch <run-id>
```

Offline storage checks: `python3 -B benchmark/evidence-test.py` and
`python3 -B benchmark/v1/archive-test.py`.

The pack command verifies the private origin and remote visibility, refuses
existing batch names, excludes environment files and credential-store folders,
redacts credential patterns in export copies and verifies archive bytes. Review
the private manifest, including redactions and omissions; resolve any remaining
sensitive material before a private commit/push. No automatic commit, push or
public aggregate export occurs. For exceptionally large batches, select smaller
run/conversation directories with distinct batch names (each LFS file must remain
within the account's per-file limit).

```sh
git -C benchmark/private add archives manifests
git -C benchmark/private commit -m 'chore📦: preserve benchmark evidence'
git -C benchmark/private push origin main
# Update only the gitlink in the public checkout after private verification.
git add benchmark/private
```

Never add raw evidence or LFS objects to the public repository. Private archives
must be uploaded and verified before deleting local originals. Fixture-only public
release assets use the separate [hydration workflow](v1/ARCHIVE.md).

Previously published Git history and issue #115 may contain historical results.
This change does not rewrite history or edit that issue.
