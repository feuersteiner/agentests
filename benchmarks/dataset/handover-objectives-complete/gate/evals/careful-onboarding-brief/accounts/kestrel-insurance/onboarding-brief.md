# Kestrel Insurance: onboarding brief

For the onboarding team. Kestrel signed on 13 November 2026; the subscription starts on
1 December 2026.

## What they bought

- 220 Flightline Enterprise seats for the 14 product teams.
- Hosted runners with 400,000 build minutes a month, with private networking to their registry.
- Premium support.
- Migration services: up to 60 days of a Corvid migration engineer between 1 December 2026 and
  28 February 2027, to move their pipelines off Jenkins and Bamboo.

Annual subscription $166,800; migration services $24,000 one-off.

## Why they bought it

Kestrel raised four objectives during the sale. Each one below gives what we will do, the result
Kestrel needs, how we will know, and when.

| Objective | Initiative | Business outcome | Success criterion | Timeline and milestones |
| --- | --- | --- | --- | --- |
| 1. Release lead time | Move all 14 product teams onto Flightline in three waves | Rate and wording changes live within a week, so they stop losing broker business to faster competitors | Median merge-to-production lead time under 3 days (from 19), on Flightline's lead-time report | By 1 October 2027. Claims team under 7 days by 31 January 2027; all 14 teams on Flightline by 30 June 2027 |
| 2. Retire Jenkins and Bamboo | Migrate all 46 pipelines (31 Jenkins, 15 Bamboo) | Neither contract renews on 1 March 2027, saving $142,000 a year | No pipeline on Jenkins or Bamboo on 26 February 2027; neither contract renewed | 20 pipelines by 18 December 2026; 40 by 22 January 2027; notices sent by 29 January; all 46 by 19 February 2027 |
| 3. First SOC 2 Type II audit | Approval rules on every production pipeline; monthly audit-log export | A report by 30 June 2027, which two broker networks (about 40% of premiums) need before renewing in July | No change-management exceptions: every production deploy from 1 February to 30 April 2027 has a recorded approval | Approval rules by 29 January 2027; first export 5 March; evidence pack by 7 May; fieldwork in May |
| 4. Build infrastructure cost | Switch off the 30 build servers as pipelines move to hosted runners | The saving the CFO's board case counts on | Under $17,000 a month (from about $26,000) on the June 2027 hosting invoice | 12 servers off in March 2027; the other 18 by 31 May 2027; target 30 June 2027 |

## Set-up notes

- Source is on Bitbucket Server; single sign-on through Okta with SAML.
- Build results go to Slack.
- Lena Kowalczyk, Platform Engineer, owns the Flightline set-up on Kestrel's side.
