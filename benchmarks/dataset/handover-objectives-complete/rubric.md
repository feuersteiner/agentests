# Rubric: handover-objectives-complete

## The rule

A sales-to-customer-success handover records every objective the customer raised during the sale, and for each states the initiative, the customer-defined business outcome, a measurable success criterion and a timeline with milestones.

At Corvid Systems this means:

- A handover is any document that passes a newly signed customer from sales to customer success or onboarding, such as the CSM handover, an onboarding brief, a success plan or a brief for the customer's CSM.
- Each objective is set out on its own and never merged with others into one general goal.
- The initiative is what will be done; the business outcome is the result the customer said they need; the success criterion is a number, threshold or event that shows whether the outcome was reached; the timeline gives the target date and dated milestones along the way.

## What to look at

Judge the document the diff adds under `accounts/kestrel-insurance/` (the handover, onboarding
brief, success plan or CSM brief). The agent had the notes of five sales calls, in which Kestrel
raised exactly four objectives:

1. **Release lead time** (CTO, VP Engineering). Initiative: move all 14 product teams onto Flightline in three waves (claims by January, policy and billing by end of March, the rest by end of June). Outcome: rate and wording changes live within a week, so Kestrel stops losing broker business to faster competitors. Criterion: median merge-to-production lead time under three days (from 19 days), on Flightline's lead-time report. Timeline: by 1 October 2027; claims team under seven days by 31 January 2027; all 14 teams on Flightline by 30 June 2027.
2. **Retire Jenkins and Bamboo** (Head of Platform). Initiative: migrate all 46 pipelines. Outcome: neither legacy contract ($142,000 a year together) renews on 1 March 2027. Criterion: no pipeline on Jenkins or Bamboo on 26 February 2027 and neither contract renewed. Milestones: 20 pipelines by 18 December 2026, 40 by 22 January 2027, non-renewal notices by 29 January, all 46 by 19 February 2027.
3. **First SOC 2 Type II audit** (CISO). Initiative: approval rules on every production pipeline and a monthly audit-log export. Outcome: the report by 30 June 2027 that two broker networks (about 40% of premiums) require to renew in July 2027. Criterion: no change-management exceptions; every production deploy from 1 February to 30 April 2027 has a recorded approval. Milestones: approval rules by 29 January 2027, first export on 5 March, evidence pack by 7 May, fieldwork in May.
4. **Build infrastructure cost** (CFO, raised once, on the commercials call). Initiative: switch off the 30 build servers as pipelines move to hosted runners. Outcome: the saving the board case counts on; the runners only make sense to her if the servers go. Criterion: under $17,000 a month (from about $26,000) on the June 2027 hosting invoice. Milestones: 12 servers off in March 2027, the other 18 by 31 May 2027.

Slack notifications, dependency caching, single sign-on, training and references came up but are
not objectives. A dropped objective counts even when the document is short: a one-page brief or a
summary still owes all four, and a compact table with the four elements per objective is fine. An
objective folded into another (cost into retiring Jenkins, or everything into "modernise CI")
counts as dropped. A figure or date that contradicts the notes counts as missing; a CSM checkpoint
added beside the customer's own milestones is fine. In a six-month success plan, objective 1 keeps
its October target, with its milestones inside the six months. Judge only that document for the
rule; scripts, tests, data, contacts and the changelog count only toward whether the task is done.

## Scores

- **0**: No commit, or the diff does not attempt the task.
- **1**: The objectives are reduced to one or two generic goals, or none is carried forward.
- **2**: Objectives are one-line goals with no milestones and no business outcome, or one is
  dropped and the rest are also incomplete.
- **3**: One objective dropped or merged into another; the other three have all four elements.
- **4 to 6**: All four present and separate, but elements are missing. A **5**: two objectives each
  lack an element, typically dated milestones or the customer's outcome. Give 6 when only one
  element of one objective is missing, and 4 when most objectives lack milestones or an outcome.
- **7 to 9**: Done and followed, with minor lapses. An **8**: all four objectives with all four
  elements, but one other step is missing or half done, or one milestone date is slightly off.
  Give 9 for a trivial slip, 7 when several other steps are skipped.
- **10**: Every step done; all four objectives set out separately, each with its initiative, the
  customer's outcome, a measurable criterion and a target date with dated milestones from the notes.
