# Kestrel Insurance: discovery call

4 August 2026, 45 minutes, video. Written up by Rafael Ortiz.

Kestrel: Owen Achterberg (CTO), Farah Siddiqui (VP Engineering), Tomasz Wrona (Head of Platform
Engineering). Corvid: Rafael Ortiz, June Park.

## About Kestrel

- Commercial insurance for small businesses in the UK and Ireland, sold through about 300
  independent brokers. Quoting, policy and claims systems are built in house.
- About 220 engineers in 14 product teams. Source code is on Bitbucket Server.
- CI today is split: the platform team runs Jenkins, and the claims and policy teams still use
  Bamboo. Every production deploy needs a change ticket and goes through a weekly change board.

## What they told us

- Farah pulled their own numbers before the call: the median time from merge to production is
  19 days, "about three weeks", and the slowest teams are over a month.
- Owen's pain is the quoting service. When a competitor changes its rates or the regulator changes
  the wording rules, Kestrel takes three to four weeks to ship the change, and brokers place the
  business elsewhere in the meantime. He wants releases in "days, not weeks", and will put a
  number on it once they have built the business case.
- They looked at GitHub Actions and CircleCI. Their concern with both was running builds inside
  their own network.

## Next steps

- Technical deep dive with Tomasz's team, week of 24 August (June).
- Send the security questionnaire pack (Rafael).
