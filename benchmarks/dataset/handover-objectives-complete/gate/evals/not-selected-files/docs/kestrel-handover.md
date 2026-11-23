# Handover: Kestrel Insurance

Prepared by Rafael Ortiz for Ines Duarte, 16 November 2026.

## The deal

- Signed: 13 November 2026 (Owen Achterberg, CTO)
- Term: 1 December 2026 to 30 November 2027, auto-renews for 12 months (60 days' notice)
- What they bought: 220 Flightline Enterprise seats, hosted runners (400,000 build minutes a
  month), premium support, migration services (60 engineer-days, December to February)
- Annual value: $166,800 ARR, plus $24,000 one-off for migration services

## People

| Name            | Role                         | Notes                               |
| --------------- | ---------------------------- | ----------------------------------- |
| Owen Achterberg | CTO                          | Economic buyer, exec sponsor        |
| Farah Siddiqui  | VP Engineering               | Runs the 14 product teams           |
| Tomasz Wrona    | Head of Platform Engineering | Champion, day-to-day contact        |
| Grace Okafor    | CISO                         | SOC 2 owner                         |
| Helen Marsh     | CFO                          | Joined the commercials call         |
| Ravi Menon      | Procurement                  | Invoices and paperwork              |

## Goals

Kestrel bought Flightline to modernise CI/CD and speed up delivery:

- **Faster releases.** Lead time from merge to production is about three weeks today; Owen wants it
  down to days, with a target of three days by Q4 2027.
- **Consolidate CI.** Get off Jenkins and Bamboo, both of which renew on 1 March 2027.
- **SOC 2.** First SOC 2 Type II audit in May 2027; they need approvals on production deploys and
  monthly audit-log exports from Flightline.

## Risks and open questions

- The migration timeline is tight: 46 pipelines to move before the March renewals.
- About half of the Bamboo deploys skip the change ticket today.
- Owen asked for insurance references; Alder Mutual has agreed to a call.

## Next steps

- Kickoff on 1 December; the migration engineer starts the same day.
- Claims team first as the pilot.
- Rafael to introduce Ines to Owen and Tomasz this week.
