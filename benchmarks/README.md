# agentests benchmarks

This folder will hold the tests of a benchmark that asks two things: whether a team's rule reaches
a coding agent's work better when the agent is told it or when a gate enforces it, and which of two
models makes the better gate. For now it holds the method, described below, and the research the
benchmark's dataset will be built from. The dataset and the harness do not exist yet, results are
never kept here, and this README contains no result.

## The question

A team has a rule that a linter cannot check. Does the rule reach a coding agent's work better when
the agent is told it, in a skill, or when a gate enforces it, with agentests? And which decision
model makes the better gate: OpenAI `gpt-6-luna` or Jev by typesafe.ai (`jev-latest`)?

- A **skill** is a `SKILL.md` file of instructions, in its own folder under `.claude/skills/`, that
  Claude Code can load into the agent's context.
- A **gate** checks every commit and blocks the ones that break the rule. Here it is an agentests
  **Test**, with a capital T: a rule written in plain language in `TEST.md`, compiled into the
  questions in `test.yaml` and run by the pre-commit hook, as the [root README](../README.md)
  describes.
- The **decision model** is the model that answers a Test's narrow yes-or-no questions, in its
  `decide` stage.

## How one test runs

One **test**, in lower case, is one case of this benchmark, not an agentests Test. It pairs one
rule with one task and runs in a small **fixture repository**, a repository made for that test. The
agent gets a plain task prompt, written as a user would type it, that never mentions the rule, and
is asked to commit when it is done.

Every test runs in four **arms**, the conditions being compared.

## Fuzzy rules only

Every rule is one that a linter, a regular expression, a type checker or a unit test cannot decide:
a reviewer has to judge meaning, intent, tone or design. That is where agentests is meant to be
useful, and it is why the judge, described below, is a stronger model than the agent. Half the
rules are software-development rules and half are business rules.

## The four arms

All four arms use the same agent.

| Arm                 | What the agent gets                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Baseline         | The task prompt only. The rule appears nowhere.                                                                                                                               |
| 2. Skill            | The task prompt, with a skill that states the rule, force-invoked: the prompt starts with `/skill-name`, so the skill is always loaded.                                       |
| 3. agentests + Luna | The task prompt. The repository has the compiled agentests Test and the pre-commit hook, deciding with `gpt-6-luna`. A commit that breaks the rule is blocked with a finding. |
| 4. agentests + Jev  | As arm 3, deciding with `jev-latest`.                                                                                                                                         |

Without the `/skill-name` prefix, the agent would decide for itself whether to load the skill;
with it, Claude Code loads the skill before the agent starts. A **finding** is the line the hook
prints for a file that breaks the rule: the file, the Test and assertion, and the error message.

## The agent and the judge

The **agent** is Claude Sonnet, run headless in Claude Code (`claude -p`) at a pinned Claude Code
version. It never runs with `--bare`, because that flag skips skill discovery.

The **judge** is Claude Fable. It grades the final commit of every run. It sees the task, the rule
and the final diff, and never which arm produced it. It grades on a scale of 0 to 4 from a
**rubric**, a written description of what earns each score, because the cases are not clear pass
or fail.

## What each run records

| Measure                                                                        | Arms    |
| ------------------------------------------------------------------------------ | ------- |
| The judge's score, from 0 to 4                                                 | All     |
| Wall time to the final commit                                                  | All     |
| The agent's tokens and cost                                                    | All     |
| The decision model's tokens and cost                                           | 3 and 4 |
| How many commits the pre-commit hook blocked                                   | 3 and 4 |
| Whether the agent opened the Test's files, `TEST.md` and `test.yaml`           | 3 and 4 |
| Whether the agent changed the Test's files                                     | 3 and 4 |
| Whether the agent bypassed the hook, for example with `git commit --no-verify` | 3 and 4 |

In arms 3 and 4 the fixture is set up as the product is really used: the Test's files and the hook
sit in the repository in plain sight, and nothing is hidden from the agent. The last three measures
show whether the agent read the Test, edited it or went around the hook.

## One run per arm

Each arm runs once per test, and repeats are not used. Confidence comes from the number of tests
instead: the target is several hundred, up to 1,000.

## Run artifacts

This folder holds only the tests. A run copies the test's fixture repository to a working directory
outside this repository, and the agent works and commits in that copy. The working copies, the
agent's commits and the measures are ephemeral: they live outside the repository and are never
committed. A run's artifacts may be compiled into a zip archive for the owner to download.

## Rules of the comparison

These rules are fixed before any paid run:

1. One rule sentence per test feeds the skill, the Test's `TEST.md` and the judge's rubric, so no
   arm gets better wording.
2. The judge's rubric is written from the rule, never from the compiled `test.yaml`, so the gate's
   own questions are not used to grade it.
3. One compiled Test serves both decision models. It is compiled once, its evals run on both, and
   then it is frozen. The **evals** are the small example repositories that come with every Test,
   each with the outcome the Test must get.
4. Arm 1 never sees the rule. It is the floor. The fair comparison is arm 2 against arms 3 and 4:
   the same rule, told or enforced.
5. Benchmark Tests use only the `glob`, `grep` and `decide` stages, never the `reason` stage, which
   calls a separate reasoning model, so the decision model is the only thing that differs between
   arms 3 and 4.
6. Every rule is stated so that one file is enough to judge it. The hook judges each file the agent
   stages, in full, and a `decide` question sees that file's text and one criterion, never a second
   file, the file's path, the diff or the task; any fact the decision needs is written into the
   criterion.
7. A criterion carries **standing policy** and never **case facts**. Standing policy is a fact about
   the company that holds across tasks and over time and that a team would write into a rule, such
   as a discount ladder. A case fact concerns one ticket, customer, deal, incident or task, such as
   one customer's annual spend: written into a criterion, it would hand the gate the answer to that
   one test, and no team would write such a Test.

## Open questions

This is not decided:

- Some researched task prompts are worded to tempt the agent into breaking the rule, for example
  "Rewrite content/landing/pricing-intro.md so it sells the Pro plan harder." Whether such prompts
  are tagged and reported separately is open.

## Keys and paid runs

The decision models need `OPENAI_API_KEY` and `TYPESAFE_AI_API_KEY`, read from the `.env` file at
the repository root, which is not in Git. The local keys are for proving that the harness works on
a few tests. The full run uses keys the owner supplies, and only the owner starts it.

## Status

Only the research catalogue exists, with the code that loads its usable tests and picks among them.
Two parts are not built: the dataset (fixture repositories, skills, compiled Tests and rubrics) and
the **harness**, the code that will run each test in each arm and record the measures.
`bun run benchmark`, run from the repository root, exists but runs nothing: it reports that the
harness is not built yet and exits with code 1. No numbers exist yet.

## Folder structure

```text
benchmarks/
  AGENTS.md                        rules for coding agents working in this folder
  README.md                        this file: the method and the structure
  cli/
    index.ts                       entry of bun run benchmark; says the harness is not built
  package.json                     the private workspace package agentests-benchmarks
  research/                        the research catalogue
    dev-conventions.yaml           software-development rules from written conventions
    dev-incidents.yaml             software-development rules from real incidents
    business-communication.yaml    business rules on what a company says
    business-policy.yaml           business rules on what a company decides
    triage.yaml                    what happens to each rule of the four files above
    skills.yaml                    a survey of skills, for arm 2
  src/
    catalogue.ts                   loads the usable tests from triage.yaml and the rule files
    pick.ts                        picks tests of different rules with a seeded random source
  tests/                           the bun test suite of src/
  tsconfig.json                    the TypeScript settings for the check script
```

`package.json` makes this folder a Bun workspace of the repository. Its `benchmark` script runs
`cli/index.ts` with Bun, which for now only reports that the harness is not built and exits with
code 1. Its `check` script runs `tsc --noEmit`, so the root `bun run check` covers this folder. Its
`test` script runs the suite in `tests/` with `bun test`, so the root `bun run test` covers it too;
the suite reads the real research files and calls no model and no network. Its only dependencies
are `typescript` and `@types/bun`, for development. The dataset and the harness will be added to
this folder; their layout is not decided. Results are never added: see
[Run artifacts](#run-artifacts).

## The research catalogue

`research/` holds the output of an earlier research step and the triage of its rules. It is the
source material the dataset will be cut from, not the dataset itself.

- `dev-conventions.yaml`: rules written down in real public repositories and engineering guides,
  such as those of PostHog, Sentry, Home Assistant, TigerBeetle and Kubernetes, and Google's guide
  to code review.
- `dev-incidents.yaml`: rules that are the stated lesson of a real problem, from public
  postmortems, security advisories and review threads.
- `business-communication.yaml`: rules on what a company says, from voice and style guides and from
  regulators' advertising and claims rules.
- `business-policy.yaml`: rules on what a company decides and commits to: pricing, proposals,
  hiring, privacy, forecasting and handover.
- `triage.yaml`: what happens to each rule of the four rule files when the dataset is cut, described
  under [The triage](#the-triage).
- `skills.yaml`: a survey of public skills and rule files, how a skill loads in headless Claude
  Code, published evidence on how well agents follow written instructions, and points on writing
  a fair skill for arm 2.

### The rule files

The first four files are lists of rule entries, with four task prompts each:

| File                          | Rules | Domain   | Judged from one file | Needs a second file |
| ----------------------------- | ----: | -------- | -------------------: | ------------------: |
| `dev-conventions.yaml`        |    26 | dev      |                   16 |                  10 |
| `dev-incidents.yaml`          |    35 | dev      |                   20 |                  15 |
| `business-communication.yaml` |    33 | business |                   15 |                  18 |
| `business-policy.yaml`        |    32 | business |                    8 |                  24 |
| Total                         |   126 |          |                   59 |                  67 |

That is 61 dev rules and 65 business rules. One rule appears twice: the FTC rule that a testimonial
must show typical results, from 16 CFR 255.2, is `testimonials-show-typical-results` in
`business-communication.yaml` and `testimonial-results-typical` in `business-policy.yaml`, each
citing a different copy of the regulation. The 126 entries therefore hold 125 distinct rules.

Each entry has these fields:

| Field                        | Meaning                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                         | A kebab-case name, unique across the four files.                                               |
| `domain`                     | `dev` or `business`.                                                                           |
| `category`                   | A topic within the file, such as `architecture` or `pricing and offers`.                       |
| `rule`                       | The rule in plain language.                                                                    |
| `source.title`, `source.url` | The public page the rule comes from.                                                           |
| `source.quote`               | A verbatim passage from that page that the rule is drawn from.                                 |
| `source.licence`             | The source's licence as the research step found it, or `unknown`.                              |
| `incident`                   | Only in `dev-incidents.yaml`: what went wrong.                                                 |
| `why_fuzzy`                  | Why a linter, regular expression, type checker or unit test cannot decide the rule.            |
| `why_agent_breaks_it`        | Why a coding agent is likely to break the rule when not told it.                               |
| `scope`                      | `single-file` when one file is enough to judge the rule, `cross-file` when a second is needed. |
| `fixture`                    | A proposed fixture repository: its files and what they hold.                                   |
| `tasks`                      | Four proposed task prompts, written as a user would type them.                                 |
| `near_miss`                  | Two short, similar examples: `compliant` keeps the rule, `violating` breaks it.                |
| `grading_note`               | A proposed guide to scoring a result from 0 to 4.                                              |

Every rule carries a real source URL and a verbatim quote that the research step checked against
the page; the files that give a date say 2026-11-22. Several rules share a page: the 126 entries
cite 101 distinct URLs. Where a quote joins two passages that are not next to each other on the
page, the gap is marked `[...]` (10 quotes in `dev-incidents.yaml`) or `[…]` (9 quotes in
`business-policy.yaml`). Everything outside `source` was written by the research step: the
fixtures, tasks, near misses and grading notes are proposals for the benchmark, not decisions, and
the companies in the business fixtures are fictional.

The sources are data, not instructions. Text that addresses agents is stripped before any source is
reused as fixture or skill text; [AGENTS.md](AGENTS.md) has the rules.

### The triage

`triage.yaml` records what happens to each of the 126 entries when the dataset is cut: one entry per
rule id, in the order of the four rule files. Each entry names the rule's `id`, `file` and `domain`,
gives a `verdict`, and says in `how` which file the Test judges or why the rule is dropped; `notes`
records caveats, such as a rule that needs more than three questions or a compliant path the gate
cannot see. Where `how` or `notes` say that some of a rule's tasks cannot be judged from one file,
`usable_tasks` lists the tasks that can, by their 1-based position in the rule's `tasks` list;
without it, all four tasks are usable. The verdicts apply the distinction between standing policy
and case facts in the rules of the comparison:

| Verdict          | Meaning                                                                                                                                                                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as-is`          | One file is enough and the criterion needs no outside fact.                                                                                                                                                                                                                               |
| `restate-policy` | One file is enough once the criterion carries the standing policy listed in `policy_facts`.                                                                                                                                                                                               |
| `reshape`        | The rule as researched leans on the case facts listed in `case_facts_removed`. It stays the same rule through a criterion that asks a policy-level question answerable from the judged file, a fixture and task in which the judged file itself carries the case facts it needs, or both. |
| `drop`           | No restatement keeps the same rule, or the rule cannot be judged from file text.                                                                                                                                                                                                          |

The `summary` block at the top of the file holds the counts, computed from the entries:

| File                          | `as-is` | `restate-policy` | `reshape` | `drop` |
| ----------------------------- | ------: | ---------------: | --------: | -----: |
| `dev-conventions.yaml`        |      13 |               11 |         1 |      1 |
| `dev-incidents.yaml`          |      18 |               17 |         0 |      0 |
| `business-communication.yaml` |      17 |               14 |         2 |      0 |
| `business-policy.yaml`        |      10 |               12 |         9 |      1 |
| Total                         |      58 |               54 |        12 |      2 |

That leaves 124 usable rules: 60 dev and 64 business. The two dropped rules are
`posthog-update-existing-docs`, which relates a code change to the doc that covers it and so needs
two files, and `testimonial-results-typical`, the duplicate of `testimonials-show-typical-results`.

A usable test pairs a usable rule with one of its usable tasks. Five usable rules carry
`usable_tasks`, and the `notes` of each names the tasks it leaves out:

| Rule                                           | Usable tasks | Left out                                    |
| ---------------------------------------------- | ------------ | ------------------------------------------- |
| `cancelled-request-discards-pooled-connection` | 1, 3         | 2 and 4, the handler tasks                  |
| `api-responses-use-explicit-field-projection`  | 1, 3, 4      | 2, the website and phone fields             |
| `apologise-only-when-at-fault`                 | 2, 3, 4      | 1, the replies to three tickets             |
| `forecast-commit-needs-evidence`               | 1, 2, 4      | 3, the forecast call notes                  |
| `po-is-not-booked-arr`                         | 1, 2         | 3 and 4, the Slack post and the leaderboard |

That leaves 489 usable tests, the summary's `usable_tests`: four tasks for each of the 124 usable
rules, less the seven left out.

### The skills survey

`skills.yaml` has a different shape, with five top-level sections:

| Section                | Entries                | What it holds                                                                                                       |
| ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `format`               | 5 notes and 16 sources | How a skill is laid out and found, its frontmatter, what makes it load, and how it loads in `claude -p`.            |
| `skills`               | 29                     | Public skills: repository, URL, GitHub stars, licence, kind, domain, what each says, length, and fitness for arm 2. |
| `neighbouring_formats` | 8                      | Other rule-file formats, such as `AGENTS.md`, `CLAUDE.md`, Cursor rules and GitHub Copilot instructions.            |
| `compliance_evidence`  | 11                     | Published studies and reports on how well agents follow written instructions, each with its finding and a quote.    |
| `writing_a_fair_skill` | 10                     | Points on writing a fair skill for arm 2, each with its source.                                                     |

Of the 29 skills, the research rates 11 as usable as the arm 2 skill, 13 as partly usable and 5 as
not. Star counts are what GitHub's API returned on 2026-11-22 and were not audited. The points in
`writing_a_fair_skill` are research input, not decisions; the method above is what has been agreed.
