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

### 1. Cut release lead time from three weeks to three days

- **Initiative:** move all 14 product teams onto Flightline.
- **Business outcome:** rate and wording changes live in the quoting service within a week of the
  decision, so Kestrel stops losing broker business to faster competitors. Owen puts the cost of
  slow rate changes at about 6% of broker renewals last year.
- **Success criterion:** median lead time from merge to production under three days across all 14
  teams, down from 19 days, measured with Flightline's lead-time report.
- **Timeline:** by 1 October 2027.

### 2. Retire Jenkins and Bamboo before they renew

- **Initiative:** migrate all 46 pipelines (31 Jenkins jobs, 15 Bamboo plans) to Flightline, with
  our migration engineer and Tomasz's platform team.
- **Business outcome:** neither the Bamboo Data Center licence nor the CloudBees support contract
  for Jenkins renews on 1 March 2027, which saves Kestrel $142,000 a year.
- **Success criterion:** no pipeline runs on Jenkins or Bamboo on 26 February 2027, and neither
  contract has renewed.
- **Timeline:** by 26 February 2027.

### 3. Pass the first SOC 2 Type II audit

- **Initiative:** approval rules on every production pipeline, and the audit log exported every
  month to Kestrel's evidence store.
- **Business outcome:** a SOC 2 Type II report by 30 June 2027. The two broker networks that place
  about 40% of Kestrel's premiums will only renew their distribution agreements in July 2027 if
  Kestrel has one.
- **Success criterion:** no exceptions on change management in the report, which means every
  production deploy in the observation window, 1 February to 30 April 2027, has a recorded
  approval.
- **Timeline:** report by 30 June 2027.

### 4. Cut the cost of build infrastructure

- **Initiative:** switch off the 30 build servers that run the Jenkins and Bamboo builds as the
  pipelines move to Flightline's hosted runners.
- **Business outcome:** the saving Helen Marsh, the CFO, put in the board case. The hosted runners
  only make sense to her if the servers go.
- **Success criterion:** build infrastructure under $17,000 a month, down from about $26,000, on
  the June 2027 hosting invoice.
- **Timeline:** by 30 June 2027.

## Risks and open questions

- The non-renewal notices depend on 40 pipelines running on Flightline by 22 January. If the
  migration slips, Kestrel pays for another year of Jenkins and Bamboo, and objective 4 slips too.
- About half of the Bamboo deploys skip the change ticket today. The approval rules have to be on
  before the observation window opens on 1 February.

## Next steps

- Kickoff on 1 December with Farah, Tomasz and Grace; the migration engineer starts the same day.
- Rafael introduces Ines to Owen this week.
