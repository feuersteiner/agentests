# agentests benchmarks

This folder will hold a benchmark that asks two things: whether a team's rule reaches a coding
agent's work better when the agent is told it or when a gate enforces it, and which of two models
makes the better gate. For now it holds the method, described below, and the research the
benchmark's dataset will be built from. The dataset, the harness and the results do not exist yet,
and this README contains no result.

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

| Measure                                      | Arms    |
| -------------------------------------------- | ------- |
| The judge's score, from 0 to 4               | All     |
| Wall time to the final commit                | All     |
| The agent's tokens and cost                  | All     |
| The decision model's tokens and cost         | 3 and 4 |
| How many commits the pre-commit hook blocked | 3 and 4 |

## One run per arm

Each arm runs once per test, and repeats are not used. Confidence comes from the number of tests
instead: the target is several hundred, up to 1,000.

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

## Open questions

These are not decided:

- 67 of the 126 researched rules need a second file to judge, such as ticket notes, a price list or
  the code already running. The gate decides one file at a time. Whether such rules are restated so
  that one file is enough, or left out, is open.
- A Test can also use the `reason` stage, which calls a separate reasoning model. Limiting
  benchmark Tests to the `glob`, `grep` and `decide` stages, so that the decision model is the only
  thing that differs between arms 3 and 4, is proposed but not decided.
- Some researched task prompts are worded to tempt the agent into breaking the rule, for example
  "Rewrite content/landing/pricing-intro.md so it sells the Pro plan harder." Whether such prompts
  are tagged and reported separately is open.

## Keys and paid runs

The decision models need `OPENAI_API_KEY` and `TYPESAFE_AI_API_KEY`, read from the `.env` file at
the repository root, which is not in Git. The local keys are for proving that the harness works on
a few tests. The full run uses keys the owner supplies, and only the owner starts it.

## Status

Only the research catalogue exists. Three parts are not built: the dataset (fixture repositories,
skills, compiled Tests and rubrics); the **harness**, the code that will run each test in each arm
and record the measures; and the results. `bun run benchmark`, run from the repository root,
exists but runs nothing: it reports that the harness is not built yet and exits with code 1. No
numbers exist yet.

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
    skills.yaml                    a survey of skills, for arm 2
```

`package.json` makes this folder a Bun workspace of the repository. Its `benchmark` script runs
`cli/index.ts` with Bun, which for now only reports that the harness is not built and exits with
code 1. The dataset, the harness and the results will be added to this folder; their layout is not
decided.

## The research catalogue

`research/` holds the output of an earlier research step. It is the source material the dataset
will be cut from, not the dataset itself.

- `dev-conventions.yaml`: rules written down in real public repositories and engineering guides,
  such as those of PostHog, Sentry, Home Assistant, TigerBeetle and Kubernetes, and Google's guide
  to code review.
- `dev-incidents.yaml`: rules that are the stated lesson of a real problem, from public
  postmortems, security advisories and review threads.
- `business-communication.yaml`: rules on what a company says, from voice and style guides and from
  regulators' advertising and claims rules.
- `business-policy.yaml`: rules on what a company decides and commits to: pricing, proposals,
  hiring, privacy, forecasting and handover.
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
