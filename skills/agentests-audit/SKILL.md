---
name: agentests-audit
description: Audit a repository against its own agent rules. Reads AGENTS.md, CLAUDE.md and similar files, compiles 5 to 7 checkable rules into agentests Tests, replays the last 50 merged PRs, and reports which PRs broke a rule, and whether a coding agent wrote them. Read-only, and needs no API key. Use when the user asks "does my agent follow AGENTS.md?", "audit my repo against our rules", "which PRs broke our conventions?", or wants to see what agentests would catch before installing it.
---

# agentests audit

Find out how often merged PRs break the repository's own written rules. The output is a report,
`AUDIT.md`: which PRs broke which rule, where, and who wrote them.

**Never change the user's repository.** All work happens in a detached git worktree and an output
folder outside the repository (`scripts/audit.mjs` creates both). Never comment on PRs or issues, and
never push. The report is for the user; what they share is their decision.

## Requirements

- Node 22 or later, and git. The GitHub CLI (`gh`), signed in, to list merged PRs; without it the
  replay uses first-parent history instead.
- No API key. By default the audit is **keyless**: agentests runs only its grep and glob stages, and
  you judge the candidates it finds. If the user wants agentests' model stages to run (their
  `.env` must hold the keys their config names), add `--keys` to `setup`.

`SCRIPT` below means `node <this skill's folder>/scripts/audit.mjs`.

## 1. Set up

```sh
SCRIPT setup --repo <repository root>
```

It installs agentests into the output folder, creates the worktree, and prints both paths. Use the
printed `out` folder as `--out` in every later step.

## 2. Pick the rules

Read every agent rules file: `AGENTS.md` and `CLAUDE.md` at any depth, `.cursor/rules/`,
`.github/copilot-instructions.md`, `.windsurfrules`, `GEMINI.md`. Pick **5 to 7** rules that:

- can be seen in the code a PR adds (not process rules such as "run the tests first" or "ask before
  large changes");
- are concrete enough that two reviewers would agree on a violation;
- are **not** already enforced by the repository's linter, formatter or type checker (check their
  configs: a rule ruff or ESLint already enforces will find nothing);
- are likely to be broken: conventions that differ from the language's default habits are the best
  candidates (a project logger instead of `logging.getLogger`, no `datetime.now()` without a time
  zone, no sleeps in tests, typed test parameters).

Tell the user which rules you picked, with the file and line each comes from, and why you left the
others out, in a short list. Then continue; the audit changes nothing, so it needs no approval.

## 3. Compile each rule into a Test

For each rule, in the worktree printed by `setup`:

```sh
cd <worktree> && node <out>/tools/node_modules/agentests/dist/cli/index.js compile <test-id>
```

It prints the full instructions for writing `.agents/tests/<test-id>/`: a `TEST.md` with the rule in
plain language, the `test.yaml` that runs, and evals. Follow them, plus these audit rules:

- Quote the rule's source in `TEST.md` (file and line), and its stated exceptions.
- **Every assertion needs a `grep`** that matches every possible violation. It can be broad: the
  grep picks candidates, and `decide` (or you, in keyless mode) judges them. An assertion without a
  grep cannot run keyless and is left out.
- Scope `select.glob` to the files the rule covers (for example `tests/**/*.py`).
- Write at least one `fail` eval, one `pass` eval that is a near miss (looks like a violation but
  is allowed), and one `skip` eval (a file outside the rule's scope).

## 4. Prove the Tests

```sh
SCRIPT evals --out <out>
```

Keyless, a Test holds when grep catches every `fail` eval and every `skip` eval is skipped. Near
misses that grep flags are expected: you judge those in step 6. Fix and rerun until all Tests hold.

## 5. Replay the merged PRs

```sh
SCRIPT replay --out <out> [--prs 50]
```

For each merged PR, it checks out the merge commit in the worktree and runs agentests against the
parent. Only violations the PR **added** become candidates: violations already in the touched
files are left out by comparing grep matches at the merge commit and at its parent. It also records
whether a coding agent wrote the PR (bot authors such as Devin or Copilot, or co-author trailers
such as Claude Code). Expect a few seconds per PR.

## 6. Judge every candidate

Open `<out>/candidates.json`. Each candidate has the rule, the check, and `snippets`: the lines the
PR added that matched, with line numbers. For each one, set:

- `verdict`: `"violation"` only when an added line breaks the rule as written, its exceptions
  included. Otherwise `"false-alarm"`. When the snippet is not enough, read the file at the merge
  commit: `git -C <worktree> show <merge>:<path>`.
- `note`: for a violation, one plain sentence saying what broke, such as "Untyped `flow_run`
  parameter in `test_retries`". For a false alarm, why it is allowed.

Be strict and consistent: the report's value is that every violation holds up when the user checks
it. If one rule produces mostly false alarms, say so in its notes: it needs a narrower check, and
that is a finding too.

## 7. Report

```sh
SCRIPT report --out <out>
```

It writes `<out>/AUDIT.md`. Show the user the headline (how many of the PRs broke a rule, and how
many of those a coding agent wrote) and the violations table, and give the path. Say plainly that
you judged the candidates and that each violation should be confirmed before the report is shared.

## 8. Next steps (offer, don't do)

- **Keep the rules from being broken again:** copy `<out>/tests/` to `.agents/tests/` in the
  repository and run `npx agentests init`, which adds a pre-commit hook. That changes the
  repository, so do it only when the user asks.
- **Clean up:** `SCRIPT cleanup --out <out>` removes the worktree. The report and Tests stay.
