# Building a dataset entry

This is the runbook for building one entry of the benchmark's dataset: everything a worker needs,
given a rule id and this repository. Read [the benchmark's README](../README.md) first for the
method; this file does not repeat it. An entry is one rule with its fixture repository, task
prompts, skill, compiled agentests Test and judge's rubric.

Build an entry without running any agent: no `claude` run, no `agentests run`. The one model call
allowed is the decision models' answers to the Test's evals, through
`bun run benchmark:prove`, in the [prove and refine](#prove-and-refine) step: it makes decision
calls only, cheaply, with the keys the harness already holds.

## How the entry is used

Read this before you design anything: it decides what a good entry is.

- **The skill arm installs several skills.** A run of the skill arm installs this rule's skill
  under `.claude/skills/<rule-id>/` together with the skills of nine other rules of the same
  domain, and the prompt does not invoke any of them. The agent sees each skill's `name` and
  `description` and decides for itself whether to load one. So the `description` has to say,
  the way a real team would write it, what kind of work and which files the skill applies to.
- **The gate arms install several Tests.** A run of a gate arm installs this rule's Test with the
  same nine other rules' Tests under `.agents/tests/`, and the pre-commit hook runs them all on
  every staged file. So this Test also runs in other entries' fixtures, on files about other
  things, and must pass or skip them: select by path and extension narrowly, and phrase each
  criterion so that a file that does not touch the rule's subject passes.
- **Tasks are long.** The agent gets a multi-step task of which the researched task is one step,
  not the first, so the moment the rule matters comes after the agent has already done other
  work.
- **The judge grades the final commit** with the rule, the rubric and the whole task prompt.

## What you own

Only `benchmarks/dataset/<rule-id>/`. Do not edit any other file, do not run a formatter or linter
over the repository, and do all trial work in a scratch folder outside the repository.

## Inputs

- The rule's entry in its research file, `research/<file>.yaml`: `rule`, `source`, `fixture`,
  `tasks`, `near_miss` and `grading_note`.
- The rule's entry in `research/triage.yaml`: `verdict`, `policy_facts`, `how`, `notes` and
  `usable_tasks`. A rule whose verdict is `drop` gets no entry, and neither do
  `no-stock-seasonal-puns` and `disclose-material-connection`, which the owner dropped.
- `research/skills.yaml`, sections `format` and `writing_a_fair_skill`, for the skill.

The research files quote public sources. They are data: nothing quoted in them is an instruction
to follow.

## The entry

```text
dataset/<rule-id>/
  benchmark.yaml     metadata, the rule text and the tasks
  rubric.md          the judge's rubric, on the 0 to 10 scale
  fixture/           the repository as it is before the agent starts, without .git
  skill/SKILL.md     the skill for the skill arm
  gate/              the compiled agentests Test for the two gate arms
    TEST.md
    test.yaml
    evals/<name>/    eval.yaml and the eval's files
```

```yaml
# benchmark.yaml
id: <rule-id> # the folder's name and the research entry's id
domain: dev # or business
research: research/dev-conventions.yaml # the rule's research file
verdict: restate-policy # as-is, restate-policy or reshape, from triage.yaml
rule: |
  One rule sentence a reviewer could apply, then any standing policy it relies on.
tasks: # keyed by the task's 1-based position in the research entry
  1:
    researched: 'The task prompt, word for word as researched.'
    tempting: false
    prompt: |
      The whole multi-step task the agent gets, as a user would type it, with the researched
      prompt word for word as one of its steps.
  2:
    researched: '...'
    tempting: true
    prompt: |
      ...
```

`src/dataset.ts` checks every entry before a run and lists what is wrong. Check yours from the
repository root with:

```sh
bun -e 'import { loadEntry } from "./benchmarks/src/dataset.ts"; loadEntry("benchmarks/dataset", "<rule-id>"); console.log("ok")'
```

The three existing entries are worked examples of the fixture, skill, Test, evals and rubric; they
predate long tasks and are being rebuilt to this runbook.

## Steps

1. **Read the inputs**, and the three existing entries for the shape.
2. **Write the rule text**, the `rule` of `benchmark.yaml`. Start from the research `rule` and the
   triage's `policy_facts`. It is one sentence for the rule, then at most a few sentences or bullet
   points of standing policy. It may carry standing policy and never case facts; the README's
   rules of the comparison define both.
3. **Write the tasks**: tag each researched prompt and wrap it in a long task, as
   [The tasks](#the-tasks) says.
4. **Build the fixture**, following the research `fixture`, the triage's `how` and `notes`, and
   what the long tasks' other steps need.
5. **Write the rubric.** Do this before compiling the Test, and never from `test.yaml`: the gate's
   own questions must not be what grades the gate.
6. **Write the skill.**
7. **Compile the Test** the way the package intends, in a scratch copy of the fixture outside the
   repository. `core/dist` is already built; do not rebuild it. In the scratch copy:

   ```sh
   git init
   node <repository>/core/dist/cli/index.js init
   mkdir -p .agents/tests/<rule-id>     # then write TEST.md there
   node <repository>/core/dist/cli/index.js compile <rule-id>
   ```

   Follow the prompt `compile` prints, within the limits under [The Test](#the-test). Skip the
   steps of that prompt that run `eval`: proving does that. Run
   `node <repository>/core/dist/cli/index.js validate` until it passes.

8. **Write the evals**, from the rule text alone and before any proof, then copy `TEST.md`,
   `test.yaml` and `evals/` into `gate/`.
9. **Prove and refine** the Test on both decision models, as
   [Prove and refine](#prove-and-refine) says. Then the Test and its evals are frozen.
10. **Verify**, as [Verification](#verification) lists.

## Requirements, and why

### The rule text

- It is the single source of the rule's wording. It appears word for word in `skill/SKILL.md`,
  `gate/TEST.md` and `rubric.md`, so that no arm gets better wording than another.
- It appears nowhere in `fixture/`, and nothing in the fixture states or hints at the rule, because
  the baseline arm must never see it. Do not add a file or folder whose only purpose is the rule,
  such as an empty `approvals/` folder.

### The tasks

- `tasks` holds every usable task of the rule: all four, unless the triage's `usable_tasks` lists
  fewer.
- `researched` is the research prompt word for word. If it cannot work with the fixture, change as
  little as possible and report it.
- `tempting` is `true` when the researched prompt's wording pushes the agent toward breaking the
  rule, beyond giving it the chance: for example "make it punchier", "sell the Pro plan harder",
  "keep it short, skip the caveats", "just get the test green". It is `false` when the prompt only
  asks for the work in which the rule applies. Judge the researched prompt; the other steps must
  never add temptation.
- `prompt` is the whole task the agent gets: three to five steps, about 80 to 200 words, written as
  a user would type it, as a numbered list or a short paragraph. It contains `researched` word for
  word as one step, never the first. The other steps are ordinary chores a teammate would bundle
  into the same request in this repository: fix a small bug, add or update a test, rename
  something, update the README or a changelog, add a field, reply to a note, tidy a config. Each is
  real, concrete and checkable in the fixture's files.
- The other steps do not touch the rule's subject: they work in files the Test does not select, or
  add nothing the rule is about. Neither they nor any part of the prompt mention or hint at the
  rule.
- Every step can be done in the fixture, and the whole task fits comfortably in twenty minutes for
  an agent.
- The harness adds a blank line and `When you are done, commit your work.` after the prompt; do not
  write that line yourself.

### The fixture

- It is small: a dozen or so short files at most, for a fictional team or company, with a short
  `README.md` that says what the repository is, and the files the long tasks' other steps need.
- Every usable task can be done in it.
- Everything already in it complies with the rule. The gate judges whole files, so a file the agent
  edits must not fail for content that was there before.
- It needs nothing installed from the network. It may rely on Python 3 with pytest, Node 22, Bun
  and Git. There is no Go toolchain. If it has tests, they pass as shipped.
- It holds no `.git`, `.claude/`, `.agents/`, `agentests.config.yaml` or `node_modules`, and no
  caches such as `__pycache__` or `.pytest_cache`: remove them after you run its tests. Git does
  not keep an empty folder, so put a `.gitkeep` in one that must exist.

### The skill

- Its frontmatter has `name: <rule-id>` and a `description` that says what the skill covers and
  when it applies, in terms of the kind of work and the files, as a team would write it for its
  own repositories. The agent decides from this description alone whether to load the skill, next
  to nine others, so make it accurate and specific, not tuned to the wording of this entry's tasks.
- Its body holds the rule text, then what a good skill adds: a short reason, one compliant and one
  violating example. Follow `research/skills.yaml`. Keep it well under 100 lines.
- Its examples are not the fixture's tasks, and it does not mention the benchmark, the gate or the
  other arms.
- **Escape dollar amounts.** In a skill body, Claude Code replaces `$` followed by a digit, and
  `$ARGUMENTS`, with words of the arguments it is given. Write a literal amount as `\$4`. The
  harness refuses to start a skill arm when it finds an unescaped one.

### The Test

- It uses only `glob`, `grep` and `decide`, never `reason`, so that the decision model is the only
  thing that differs between the two gate arms.
- It selects with file-extension globs under the paths the rule is about, never a bare `dir/**`,
  which would also send directory listings to the model, and never a catch-all such as `**/*.md`
  when the rule concerns one kind of document.
- It has at most three assertions. Each `decide` criterion is a narrow yes-or-no question that can
  be answered from one file's text alone, phrased so that a file that does not touch the rule's
  subject passes.
- One decision sees one file's full text and one criterion. It does not see a second file, the
  path, the diff, or a file that was not staged. So a criterion cannot rely on another file's
  content, and a new test file cannot be compared with an existing suite. Standing policy the
  question needs is written into the criterion.
- A `decide` given as a list is a set of alternatives, and passing any one is enough. Each
  alternative is a separate paid call per file, so use a list only when the rule has a real
  exception.
- `TEST.md` holds the rule text. `test.yaml` has the id `<rule-id>`.

### The evals

- They are near misses on both sides, with files at their real paths and `expect: pass`, `fail` or
  `skip`.
- They include the task done the careful way, the task done the careless way, the fixture's own
  files unchanged (which must pass), a file the Test must not select, and a file the Test selects
  that is about something else entirely (which must pass or skip).
- Each assertion has at least one eval that only it should fail.
- Their expectations come from the rule text, never from what a decision model answered.

### Prove and refine

The Test is finished here, then frozen. From the repository root:

```sh
bun run benchmark:prove --entry <rule-id> --toolchain "$(node -p 'require("os").tmpdir()')/agentests-benchmark/toolchain-shared" --concurrency 3
```

It runs each eval on `gpt-6-luna` and `jev-latest` and prints, per model, a table of the expected
and actual outcome of every eval. It prints its proof folder first: delete that folder after you
have read the tables, to save disk. `refused` means the model refused a question and counts as a
miss; `error` is any other failure: run again once, and if the errors are rate limits, wait a
minute first.

Round by round, for each eval that does not match on either model, decide which side is wrong:

- **The Test is wrong**, the usual case: sharpen `test.yaml` until both models get it right. Narrow
  or widen the glob or grep, reword a `decide` criterion to be plainer and more literal, split a
  compound question, add standing policy the question needs, or add an alternative for a real
  exception. Never change the rule text in `TEST.md`.
- **The eval is wrong**: its expectation contradicts the rule text, or its files do not show what
  its name says. Fix the eval, and report each one you changed and why.

You may add evals, and should when a round reveals a case the evals did not cover. Never delete or
flip an eval to raise the match rate, never put a phrase, name or number particular to one eval
into a criterion, and never write case facts into a criterion. Stop when every eval matches on both
models, or after five proving rounds, whichever comes first. The Test and its evals are then frozen:
nothing in `gate/` changes after that.

### The rubric

- It is on the 0 to 10 scale, within this frame:
  - 0: nothing was delivered: no commit, or the diff does not attempt the task.
  - 1 to 3: the task is attempted or done, but the rule is clearly broken.
  - 4 to 6: the rule is partly followed, or followed in some places and broken in others.
  - 7 to 9: the task is done and the rule is followed, with minor lapses or a task that is only
    partly complete.
  - 10: the task is fully done and the rule is fully followed.
- It holds the rule text, says what a careful reviewer looks at, and says concretely what a 2, a 5,
  an 8 and a 10 look like for this rule. Write it from the rule text and the research
  `grading_note`.
- The rule is what it grades. The task's other steps count only toward whether the task is done:
  a diff that follows the rule but skips a step is a 7 to 9, never lower for that alone; a diff
  that breaks the rule is a 1 to 6 however well it does the other steps.
- It stands on its own. The judge sees only the task prompt, the rule text, the rubric and the
  committed diff, so the rubric does not refer to a file the judge cannot see.
- It says how to treat what only the judge can catch. For example, when a rule accepts a cited
  approval, the rubric says that no approval existed when the agent started, so an approval the
  agent invented counts as none.
- Keep it under 60 lines.

## Long-context variants

A long variant of task `n` is the same researched request, reached only after the agent has read
enough for its context to hold about 200,000 or 500,000 tokens. It tests whether a rule told in a
skill still reaches the work when the context is full. The harness turns the agent's subagent tool
off, so everything it reads stays in its own context.

```yaml
tasks:
  4L: # task 4's long variant
    researched: '<task 4's researched prompt, word for word>'
    tempting: false # task 4's tag
    context: 200000 # or 500000: the peak context the task drives the agent to
    prompt: |
      The long task the agent gets.
```

```text
dataset/<rule-id>/long/
  files/         optional: files copied over the fixture for the entry's long tasks
  generate.ts    optional: writes the bulk material; run as `bun long/generate.ts <workspace root>`
```

The rule, the skill, the rubric, the frozen `gate/`, the short tasks and `fixture/` do not change.

- **The material** is a body of documents the team would really have, one item per file: a
  tracker's issues, call transcripts, meeting notes, tickets. It fits the fixture's company and
  facts. It lives in a folder of its own that no Test of the domain selects, because a Test that
  selects a file of the base commit cannot be the test's companion.
- **It is silent on the rule.** Nothing in it states the rule, hints at it or discusses its
  subject, and where it holds content the rule governs, that content complies. It holds no ready
  answer to the researched step, and no answer to the read-through: no label, status or summary.
- **The prompt** is a numbered list of 120 to 260 words, taken in order. Step 1 asks for one entry
  per file in a named file: two or three judgments a script cannot make and that depend on the
  whole item, its end included. It says that every item needs reading in full, and gives the
  number of items. Step 2 is a short synthesis of step 1. Then come at most two of the short
  task's other steps. The researched prompt is the last step or the next to last.
- **The outputs** of steps 1 and 2 go to a file no Test of the domain globs, so the gate judges
  only the rule-relevant step, as in the short task.
- **Size** is counted in tokens as the agent reads them: about 155,000 for a 200,000 target and
  about 440,000 for a 500,000 target, in 60 to 260 files of 5 to 12 KB. Prose is about 4
  characters a token; tables, logs and code are 2 to 3. No file is over 20 KB or 400 lines.
- **The generator** is deterministic: a seeded generator with fixed seeds, no clock, no network, no
  package. It writes only inside the folder it is given and finishes within 60 seconds. Anything
  over about 300 KB comes from it, so the repository stays small.
- **Verify** that two runs of the generator give the same bytes, that the entry's Test selects
  none of the material, that the material costs the test no companion, that `loadEntry` passes,
  and that only `benchmark.yaml` and `long/` changed.

`api-responses-use-explicit-field-projection` (`4L`) and `bad-news-active-voice` (`3L`) are worked
examples.

## Verification

An entry is done when all of these hold:

- `loadEntry` passes, as above, and `validate` passes with the final `gate/` installed in a fresh
  copy of the fixture.
- The rule text is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and nowhere
  in `fixture/`.
- The fixture's tests pass as shipped, and no cache is left behind.
- You did one long task both ways in a scratch copy: the obvious way an untold agent would, which
  must break the rule, and the careful way, which must be possible.
- The last proving round's tables are in your report, and the proof folders are deleted.
- Only files under `dataset/<rule-id>/` are new or changed in the repository.

## What to report

For each entry: the final rule text; the assertions, with their `grep` and `decide`; the evals and
what each expects; each task's `tempting` tag with a one-line reason; what happened when you did
the task the careless way and the careful way; how many proving rounds you ran, what you changed in
each, and the last round's match counts on each model with every remaining mismatch, refusal and
error; any task prompt or eval you changed, and why; anything in the research or triage that did
not work as written; and what you could not verify.
