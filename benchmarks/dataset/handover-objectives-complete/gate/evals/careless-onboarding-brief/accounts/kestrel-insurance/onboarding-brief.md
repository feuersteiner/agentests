# Kestrel Insurance: onboarding brief

## What they bought

Kestrel Insurance signed a 12-month Flightline Enterprise subscription on 13 November 2026,
starting 1 December 2026:

- 220 Enterprise seats
- Hosted runners, 400,000 build minutes a month
- Premium support
- Migration services: up to 60 engineer-days from December to February

Annual subscription: $166,800, plus $24,000 one-off for migration services.

## Why they bought it

Kestrel's releases take about three weeks from merge to production, and their CI is split between
Jenkins and Bamboo, both up for renewal on 1 March 2027. They chose Flightline for faster
releases, one CI platform instead of two, an audit trail for their first SOC 2 audit and lower
build infrastructure costs. Hosted runners with private networking were the deciding factor over
GitHub Actions and CircleCI.

## What the onboarding team needs to know

- 46 pipelines to migrate (31 Jenkins, 15 Bamboo), claims team first.
- Source is on Bitbucket Server; SSO through Okta with SAML.
- They want build results in Slack and Maven dependency caching.
- Main contacts: Tomasz Wrona (platform) and Lena Kowalczyk, who owns the Flightline set-up.
