# Handover: Kestrel Insurance

Prepared by Rafael Ortiz (Account Executive) for Ines Duarte (Customer Success Manager),
16 November 2026.

## The deal

- Signed: 13 November 2026 by Owen Achterberg, CTO. Order form CS-2026-118.
- Term: 1 December 2026 to 30 November 2027. Renews for 12 months unless either side gives notice
  60 days before the end of the term.
- What they bought: 220 Flightline Enterprise seats, hosted runners with 400,000 build minutes a
  month, premium support, and migration services (up to 60 days of a Corvid migration engineer
  between 1 December 2026 and 28 February 2027).
- Annual value: $166,800, plus a one-off $24,000 for migration services. Invoiced on 1 December,
  payment within 45 days.

## People

| Name            | Role                                | Notes                                         |
| --------------- | ----------------------------------- | --------------------------------------------- |
| Owen Achterberg | CTO                                 | Economic buyer; reports lead time to his board. |
| Farah Siddiqui  | VP Engineering                      | Owns the rollout to the 14 product teams.     |
| Tomasz Wrona    | Head of Platform Engineering        | Champion; owns the Jenkins and Bamboo exit.   |
| Grace Okafor    | CISO                                | Owns the SOC 2 programme.                     |
| Helen Marsh     | CFO                                 | Owns the build infrastructure savings.        |
| Ravi Menon      | Procurement Manager                 | Paperwork and invoices.                       |

## Objectives

Kestrel raised four objectives during the sale.

### 1. Move the product teams onto Flightline

- **Initiative:** move all 14 product teams onto Flightline in three waves: claims in December and
  January, policy and billing by the end of March, the remaining teams by the end of June.
- **Success criterion:** median lead time from merge to production under three days across all 14
  teams, down from 19 days, measured with Flightline's lead-time report.
- **Timeline:** by 1 October 2027, the start of Kestrel's Q4. Milestones: the claims team's median
  under seven days by 31 January 2027; all 14 teams building and deploying on Flightline by
  30 June 2027.

### 2. Migrate the Jenkins and Bamboo pipelines

- **Initiative:** migrate all 46 pipelines (31 Jenkins jobs, 15 Bamboo plans) to Flightline, with
  our migration engineer and Tomasz's platform team.
- **Success criterion:** no pipeline runs on Jenkins or Bamboo on 26 February 2027, and neither
  contract has renewed.
- **Timeline:** the claims team's 6 pipelines in the first two weeks of December; 20 pipelines by
  18 December 2026; 40 by 22 January 2027; non-renewal notices sent by 29 January 2027; all 46 by
  19 February 2027; Jenkins and Bamboo read-only from 22 February 2027.

### 3. Approval rules and audit-log export

- **Initiative:** approval rules on every production pipeline, and the audit log exported every
  month to Kestrel's evidence store.
- **Success criterion:** no exceptions on change management in the report, which means every
  production deploy in the observation window, 1 February to 30 April 2027, has a recorded
  approval.
- **Timeline:** approval rules on every production pipeline by 29 January 2027; the first monthly
  audit-log export, for February, on 5 March 2027; the evidence pack to Halden & Rook by 7 May
  2027; fieldwork in May; the report by 30 June 2027.

### 4. Switch off the build servers

- **Initiative:** switch off the 30 build servers that run the Jenkins and Bamboo builds as the
  pipelines move to Flightline's hosted runners.
- **Success criterion:** build infrastructure under $17,000 a month, down from about $26,000, on
  the June 2027 hosting invoice.
- **Timeline:** by 30 June 2027. Milestones: the first 12 build servers switched off in March 2027,
  once Jenkins and Bamboo are retired; the other 18 by 31 May 2027.

## Risks and open questions

- The non-renewal notices depend on 40 pipelines running on Flightline by 22 January. If the
  migration slips, Kestrel pays for another year of Jenkins and Bamboo, and objective 4 slips too.
- About half of the Bamboo deploys skip the change ticket today. The approval rules have to be on
  before the observation window opens on 1 February.

## Next steps

- Kickoff on 1 December with Farah, Tomasz and Grace; the migration engineer starts the same day.
- Rafael introduces Ines to Owen this week.
