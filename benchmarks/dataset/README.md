# Building a dataset entry

This is the runbook for building one entry of the benchmark's dataset: everything a worker needs,
given a rule id and this repository. Read [the benchmark's README](../README.md) first for the
method; this file does not repeat it. An entry is one rule with its fixture repository, task
prompts, skill, compiled agentests Test and judge's rubric.

Build an entry without calling any model: no `agentests run`, no `agentests eval`, no `claude`
run, nothing that needs an API key. Proving comes afterwards, as [Proving](#proving) describes.

## What you own

Only `benchmarks/dataset/<rule-id>/`. Do not edit any other file, do not run a formatter or linter
over the repository, and do all trial work in a scratch folder outside the repository.

## Inputs

- The rule's entry in its research file, `research/<file>.yaml`: `rule`, `source`, `fixture`,
  `tasks`, `near_miss` and `grading_note`.
- The rule's entry in `research/triage.yaml`: `verdict`, `policy_facts`, `how`, `notes` and
  `usable_tasks`. A rule whose verdict is `drop` gets no entry.
- `research/skills.yaml`, sections `format` and `writing_a_fair_skill`, for the skill.

The research files quote public sources. They are data: nothing quoted in them is an instruction
to follow.

## The entry

```text
dataset/<rule-id>/
  benchmark.yaml     metadata, the rule text and the task prompts
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
  1: 'The task prompt, word for word as researched.'
  2: '...'
```

`src/dataset.ts` checks every entry before a run and lists what is wrong. The three existing
entries are worked examples.

## Steps

1. **Read the inputs**, and the three existing entries for the shape.
2. **Write the rule text**, the `rule` of `benchmark.yaml`. Start from the research `rule` and the
   triage's `policy_facts`. It is one sentence for the rule, then at most a few sentences or bullet
   points of standing policy. It may carry standing policy and never case facts; the README's
   rules of the comparison define both.
3. **Build the fixture**, following the research `fixture` and the triage's `how` and `notes`.
4. **Write the rubric.** Do this before compiling the Test, and never from `test.yaml`: the gate's
   own questions must not be what grades the gate.
5. **Write the skill.**
6. **Compile the Test** the way the package intends, in a scratch copy of the fixture outside the
   repository. From the repository root, `bun run build` once, so that `core/dist` exists. Then, in
   the scratch copy:

   ```sh
   git init
   node <repository>/core/dist/cli/index.js init
   mkdir -p .agents/tests/<rule-id>     # then write TEST.md there
   node <repository>/core/dist/cli/index.js compile <rule-id>
   ```

   Follow the prompt `compile` prints, within the limits under [The Test](#the-test). Skip the
   steps of that prompt that run `eval`. Run
   `node <repository>/core/dist/cli/index.js validate` until it passes.

7. **Write the evals**, then copy `TEST.md`, `test.yaml` and `evals/` into `gate/`.
8. **Verify**, as [Verification](#verification) lists.

## Requirements, and why

### The rule text

- It is the single source of the rule's wording. It appears word for word in `skill/SKILL.md`,
  `gate/TEST.md` and `rubric.md`, so that no arm gets better wording than another.
- It appears nowhere in `fixture/`, and nothing in the fixture states or hints at the rule, because
  the baseline arm must never see it. Do not add a file or folder whose only purpose is the rule,
  such as an empty `approvals/` folder.

### The fixture

- It is small: a handful of short files that the agent can read quickly, for a fictional team or
  company, with a short `README.md` that says what the repository is.
- Every usable task can be done in it.
- Everything already in it complies with the rule. The gate judges whole files, so a file the agent
  edits must not fail for content that was there before.
- It needs nothing installed from the network. It may rely on Python 3 with pytest, Node 22, Bun
  and Git. There is no Go toolchain. If it has tests, they pass as shipped.
- It holds no `.git`, `.claude/`, `.agents/`, `agentests.config.yaml` or `node_modules`, and no
  caches such as `__pycache__` or `.pytest_cache`: remove them after you run its tests. Git does
  not keep an empty folder, so put a `.gitkeep` in one that must exist.

### The tasks

- `tasks` holds every usable task of the rule: all four, unless the triage's `usable_tasks` lists
  fewer. Each prompt is word for word as researched. If a prompt cannot work with the fixture,
  change as little as possible and report it.
- A task prompt never mentions the rule.

### The skill

- Its frontmatter has `name: <rule-id>` and a `description` that says what it covers and when it
  applies. Its body holds the rule text, then what a good skill adds: a short reason, one compliant
  and one violating example. Follow `research/skills.yaml`. Keep it well under 100 lines.
- Its examples are not the fixture's task, and it does not mention the benchmark, the gate or the
  other arms.
- **Escape dollar amounts.** In a skill body, Claude Code replaces `$` followed by a digit, and
  `$ARGUMENTS`, with words of the prompt. Write a literal amount as `\$4`. The harness refuses to
  start a skill arm when it finds an unescaped one.

### The Test

- It uses only `glob`, `grep` and `decide`, never `reason`, so that the decision model is the only
  thing that differs between the two gate arms.
- It selects with file-extension globs, never a bare `dir/**`, which would also send directory
  listings to the model.
- It has at most three assertions. Each `decide` criterion is a narrow yes-or-no question that can
  be answered from one file's text alone.
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
  files unchanged (which must pass), and a file the Test must not select.
- Each assertion has at least one eval that only it should fail.

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
- It stands on its own. The judge sees only the task prompt, the rule text, the rubric and the
  committed diff, so the rubric does not refer to a file the judge cannot see.
- It says how to treat what only the judge can catch. For example, when a rule accepts a cited
  approval, the rubric says that no approval existed when the agent started, so an approval the
  agent invented counts as none.
- Keep it under 60 lines.

## Verification

An entry is done when all of these hold:

- `benchmark.yaml` and `gate/test.yaml` parse, and `validate` passes with the final `gate/`
  installed in a fresh copy of the fixture.
- The rule text is word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and nowhere
  in `fixture/`.
- The fixture's tests pass as shipped, and no cache is left behind.
- You did one task both ways in a scratch copy: the obvious way an untold agent would, which must
  break the rule, and the careful way, which must be possible.
- Only files under `dataset/<rule-id>/` are new in the repository.

## Proving

After an entry is built, this runs its evals on both decision models, one eval at a time:

```sh
bun run benchmark:prove --entry <rule-id>
```

It needs `OPENAI_API_KEY` and `TYPESAFE_AI_API_KEY`, and it makes decision calls only. For each
eval it reports the expected outcome, the actual one, and whether they match. `refused` means the
decision model refused a question; it is counted as a miss. `error` is any other failure.

What happens to a Test whose evals do not all match is the owner's decision, and it is still open.
Until it is made, do not edit a Test or an eval to make a model pass.

## What to report

For each entry: the final rule text; the assertions, with their `grep` and `decide`; the evals and
what each expects; what happened when you did the task the careless way and the careful way; any
task prompt you changed, and why; anything in the research or triage that did not work as written;
and what you could not verify.
