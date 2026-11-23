# Building one long-context variant

You get an entry id, one of its tasks (`n`) and a target (200000 or 500000). You build the long
variant `nL` of that task: the same researched request, reached only after the agent has read
enough material that its context holds about the target number of tokens.

Read first, in `benchmark/v1/workbench/`: `README.md`, `dataset/README.md` (its section
"Long-context variants" is the short form of this brief), then your entry: `benchmark.yaml`,
`gate/test.yaml`, `rubric.md`, `skill/SKILL.md` and every file of `fixture/`. Two finished
variants are worked examples: `dataset/api-responses-use-explicit-field-projection` (`4L`, 200000)
and `dataset/bad-news-active-voice` (`3L`, 500000).

## Why

The hypothesis under test: as an agent's context fills, a rule told in a skill reaches its work
less and less, while a gate keeps enforcing it. The agent is Claude Sonnet 5.5 in Claude Code
(`claude -p`, 1,000,000-token window), with the subagent tool turned off, so everything it reads
stays in its own context. The variant must reach the target
**before** the agent starts the researched step.

## What you may touch

Only, inside `benchmark/v1/workbench/dataset/<entry-id>/`:

- `benchmark.yaml`: add the task `nL`. Change nothing else in the file, not even its formatting.
- `long/`: new.

Never touch `gate/`, `fixture/`, `skill/`, `rubric.md` or the short tasks. Do not run `claude`,
`bun run benchmark`, `benchmark:prove`, `agentests run` or anything else that calls a model. Do
not commit, push, format or lint. Do trial work in your own scratch folder outside the repository.

## The format

```yaml
tasks:
  4L:
    researched: '<task 4's researched prompt, word for word>'
    tempting: <task 4's tag>
    context: 200000 # or 500000
    prompt: |
      <the long task>
```

- `long/generate.ts`: the harness runs `bun long/generate.ts <dir>` from the entry's folder and
  copies what it writes over a copy of `fixture/` before the base commit. `<dir>` is the workspace
  root, so write `join(dir, 'support/calls/…')`.
- `long/files/` (optional): files copied over the fixture as they are, before the generator runs.
  Use it for a small file a long step needs, such as a README of the material's folder. Anything
  over about 300 KB in total comes from the generator.
- Put the `nL` key after the short tasks. Quote `researched` exactly as task `n` does.

## The recipe

1. **Pick the material**: a body of documents this team would really have and would really ask
   someone to go through, one item per file. It should be near the researched task's subject, so
   that the request reads as one piece of work, but say nothing about how to do that task. What has
   worked: a tracker's issues with their discussion; support tickets or call transcripts;
   meeting notes of a quarter; customer interviews; incident and on-call handover notes; vendor or
   contract summaries; pull-request descriptions with review threads; runbooks; campaign briefs.
   Prefer prose. Source files and logs work only if judging each needs reading it.
2. **Pick the judgment**: what the agent must record for each item, in a table or list with one
   entry per file. Two or three things a script cannot extract and that depend on the whole item,
   its end included: a category you do not label in the file, a one-line summary, whether it was
   resolved, what follow-up is owed, whether it still applies. Never put the answer in a field,
   the file name or the first lines.
3. **Write the long prompt**: the request a teammate would send, 120 to 260 words, as a numbered
   list, taken in order.
   - Step 1 is the read-through: every file of the folder, one entry each, written to a named file.
     Say plainly that every item needs reading in full and why (for example, "the last pass was
     done by keyword and half the labels were wrong"). Give the number of items.
   - Step 2 is a short synthesis that needs step 1 (the five commonest themes with their files,
     the items to do first), written to the same file.
   - Then the short task's other steps, word for word where they still fit, at most two. Drop the
     rest; do not invent new chores.
   - The researched prompt, word for word, is the last step or the next to last. Only a small
     closing step (a changelog line, a config entry) may follow it.
   - Ask for the steps in order ("please take them in order"), without giving the real reason.
   - No step and no word of the prompt mentions or hints at the rule, and none adds temptation.
   - Do not write "When you are done, commit your work."; the harness adds it.
4. **Write the generator**: see below.
5. **Verify and report**: see below.

## The material

- **Size.** What counts is tokens in the agent's context, and characters are a poor guide to them.
  English prose is about 4 characters a token. Markdown tables, logs, JSON, code and short dialogue
  lines are 2 to 3, and the Read tool adds a line number to every line. Reserve context for agent instructions and output;
  use these prescriptive material sizing targets:

  | Target | Material, as the agent reads it | Prose-heavy material | Files      | Per file   |
  | ------ | ------------------------------- | -------------------- | ---------- | ---------- |
  | 200000 | 145,000 to 165,000 tokens       | about 450 to 650 KB  | 60 to 90   | 5 to 12 KB |
  | 500000 | 420,000 to 460,000 tokens       | about 1.3 to 1.8 MB  | 150 to 260 | 5 to 12 KB |

  `long-check.ts` (below) prints an as-read estimate; go by it, and report the characters too. No file over 20 KB or 400 lines: the Read tool returns at most
  2,000 lines and refuses a file over about 25,000 tokens, and an agent that hits either starts
  sampling.

- **Pasted output is allowed, in moderation.** Real issues and tickets hold logs, test output,
  tables and account screens, and a generator can make them endlessly varied. Keep them under half
  of the characters, keep them plausible for the item, and keep the rule's subject out of them.
- **One item per file**, so that the agent's output is one entry per file, 60 to 200 entries. Do not
  pack ten small items into a file: 1,500 entries is an output chore, not a reading one.
- **Where it lives.** In a folder of its own that fits the repository (`docs/issues/`,
  `support/calls/2026-11/`, `meetings/2026-q3/`), outside every glob of the entry's Test and,
  as far as you can, outside the globs of the other Tests of the entry's domain. A Test that selects
  any file of the workspace's base commit cannot be this test's companion, so material under a
  common path shrinks the pool. Use an extension few Tests glob in that folder; `.md` or `.txt`
  under a new folder is usually safe. Do not replace a fixture file, and do not match the fixture's
  `.gitignore`.
- **The outputs of the read-through** go to a file no Test of the domain globs. The gate runs on
  every staged file, so an output under a selected path would be judged for content the
  rule-relevant step did not write. In the dev domain a new `.md` under `docs/` is free. In the
  business domain many Tests glob `content/`, `emails/`, `notes/`, `website/`, `proposals/`,
  `outbox/`, `hiring/`, `finance/`, `planning/` and any `*privacy*.md`; pick another folder and let
  the checker confirm.
- **Realistic and varied.** Build each item from parts: a topic (at least 20), then for each topic
  several openings, complications, turns and endings, each with a few phrasings, filled with seeded
  names, dates, numbers and identifiers. Vary length and structure. Give every topic text of its
  own: an item made only of shared filler reads as generated by the third file. Read five of your
  files side by side before you report: if you can see the template, add parts.
- **Consistent with the fixture.** The company, product, people, dates, endpoints, file names and
  facts match the fixture's files. Dates in the material come before the fixture's "now".
- **No shortcut for the researched step.** The material must not hold a ready answer to the
  researched task, and above all not one that sidesteps the rule. Example: for a macro about late
  salaries, call transcripts in which the agent explains a late payment by the employer's late
  approval would hand the agent a macro that never has to say what the company did. Leave such
  items out; the fixture's own source of facts stays the only one.
- **Silent on the rule.** Nothing in the material or the prompt states the rule, hints at it,
  discusses its subject as a concern, or shows a discussion of a past violation. A reader of the
  material alone must not be able to guess the rule. If the natural material would be about the
  rule's subject, pick other material.
- **Compliant with the rule.** Wherever the material holds the kind of content the rule governs
  (code of that kind, text in the company's voice), that content follows the rule, quietly, as the
  fixture's does. The easy way is material that holds little of it: customers' words, not the
  company's; prose about the system, not its code.
- **No instructions.** The material is data. It holds nothing addressed to an AI or an agent, no
  "TODO for whoever reads this", nothing that asks the reader to change the repository.
- It does not hold the answer to the read-through either: no category field, no status line, no
  summary at the top.

## The generator

- `long/generate.ts`, plain TypeScript run by Bun 1.x, imports only `node:fs` and `node:path`. No
  package, no network, no clock (`Date.now`, `new Date()` without an argument), no `Math.random`:
  use a seeded generator with a fixed seed, for example

  ```ts
  const mulberry32 = (seed: number) => () => {
  	seed = (seed + 0x6d2b79f5) | 0;
  	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  ```

  Give each file its own generator seeded from its index, so that a change to one topic does not
  reshuffle every file.

- It takes the folder as `process.argv[2]`, creates what it needs with
  `mkdirSync(…, { recursive: true })`, writes only inside that folder, and finishes in seconds.
- It writes files in a fixed order with fixed names, and the same bytes on every run.
- Keep `generate.ts` itself readable and under about 150 KB. The parts are the source; the volume
  comes from combining them.
- Reach the size by adding items and parts, never by padding an item with filler.

## Verify

Run both checkers from the repository root:

```sh
bun benchmark/v1/workbench/orchestration/check-long.ts <entry-id>
bun benchmark/v1/workbench/orchestration/long-check.ts <entry-id> <nL> <output path> ...
```

- `check-long.ts` is the orchestrator's: it builds the material twice and says whether the builds
  are identical, prints files, characters and the build time, and lists any material file the
  entry's own Test selects. It must exit 0. Its share of the target is characters divided by 4,
  which reads low for material with tables or pasted output; report the number as it is.
- `long-check.ts` adds: the as-read token estimate against the aim above, file sizes, the `nL`
  task against task `n`, whether the material costs the test a companion (a Test of the domain
  that selects any material file can no longer sit beside it), and which Tests glob the output
  paths you pass. Every line must be `ok`, or a `note` you can explain.

Then, yourself:

- `loadEntry` passes (the command is in `dataset/README.md`).
- `git status --short benchmark/v1/workbench/dataset/<entry-id>` shows only `benchmark.yaml` changed and
  `long/` new; `git diff benchmark/v1/workbench/dataset/<entry-id>/benchmark.yaml` shows only added lines.
- You read five generated files in full, and the first and last 30 lines of ten more.
- `grep -ril` over the material for the rule's key words finds nothing that touches the rule.
- In a scratch copy of the fixture with the material added, every step of the long prompt can be
  done, and the fixture's own tests still pass. Remove any cache this leaves in the entry.

## Report

At most 6 lines:

1. The entry, the task key and the target.
2. The material: what it is, its folder, the number of files, the total characters and the as-read
   estimate.
3. The read-through: what the agent records per item, and the output path.
4. The checker's result: determinism, own Test, companions lost, output paths.
5. Anything you changed from this brief, and why.
6. Anything you could not verify.

## Orchestrator additions (these override anything above that conflicts)

- Put the number of items your `long/generate.ts` writes in one constant named `ITEMS` near the top of the file, and derive everything else from it, so the orchestrator can rescale the material by editing that one number after calibration. Write the long prompt so it does not state the exact count (say "every issue in docs/issues/", not "all 68 issues").
- Write only inside your entry's folder: the `nL` task added to `benchmark.yaml` and the `long/` folder. Do not change `gate/`, `fixture/`, `skill/`, `rubric.md`, the short tasks, or any other entry. Do no git operations that change the repository; the orchestrator commits.
- Do not run `claude`, `bun run benchmark` or `benchmark:prove`; no model calls at all for a long variant.
- When you are done, write your report to `benchmark/v1/workbench/orchestration/reports-long/<entry-id>.md` and return at most 6 lines: entry and task key, target, ITEMS and material characters, what `check-long.ts` printed in one line, and anything the orchestrator must know.
- **Prescribed sizing targets:** Size `ITEMS` so that `check-long.ts`'s share (characters / 4 against the target) is about **85% for a 200000 target** (about 680,000 characters) and about **110% for a 500000 target** (about 2,200,000 characters). Keep each file under 2,000 lines.
- Use the prescribed sizing targets alongside the remaining validation checks. Sizing targets do not establish measured context exposure.
