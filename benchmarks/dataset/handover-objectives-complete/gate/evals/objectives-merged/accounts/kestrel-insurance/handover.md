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

Kestrel raised these objectives during the sale.

### 1. Modernise delivery

- **Initiative:** move all 14 product teams and all 46 pipelines onto Flightline and its hosted
  runners, with our migration engineer and Tomasz's platform team.
- **Business outcome:** faster and cheaper delivery across engineering, on one modern platform
  instead of two legacy CI tools and a build farm.
- **Success criterion:** all 14 teams building and deploying on Flightline.
- **Timeline:** by 30 June 2027. Milestones: 20 pipelines by 18 December 2026; all 46 pipelines by
  19 February 2027; policy and billing teams by the end of March 2027.

### 2. Pass the first SOC 2 Type II audit

- **Initiative:** approval rules on every production pipeline, and the audit log exported every
  month to Kestrel's evidence store.
- **Business outcome:** a SOC 2 Type II report by 30 June 2027. The two broker networks that place
  about 40% of Kestrel's premiums will only renew their distribution agreements in July 2027 if
  Kestrel has one.
- **Success criterion:** no exceptions on change management in the report, which means every
  production deploy in the observation window, 1 February to 30 April 2027, has a recorded
  approval.
- **Timeline:** approval rules on every production pipeline by 29 January 2027; the first monthly
  audit-log export, for February, on 5 March 2027; the evidence pack to Halden & Rook by 7 May
  2027; fieldwork in May; the report by 30 June 2027.

## Risks and open questions

- The non-renewal notices depend on 40 pipelines running on Flightline by 22 January. If the
  migration slips, Kestrel pays for another year of Jenkins and Bamboo,.
- About half of the Bamboo deploys skip the change ticket today. The approval rules have to be on
  before the observation window opens on 1 February.

## Next steps

- Kickoff on 1 December with Farah, Tomasz and Grace; the migration engineer starts the same day.
- Rafael introduces Ines to Owen this week.
