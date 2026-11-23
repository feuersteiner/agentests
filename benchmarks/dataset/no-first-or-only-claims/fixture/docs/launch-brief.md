# Launch brief: trace replay

Owner: Imani Okafor, product marketing. Launch date: Tuesday 1 December 2026.

## What it is

Trace replay records a failed request and lets an engineer step through it afterwards, span by
span, from the browser to the database. At each span the engineer sees the timing, the request
and response payloads, and the log lines written while that span was open.

## How it works

- Driftlog keeps a replay for every request that ends in a 5xx response or runs longer than the
  latency threshold the team sets (the default is 2 seconds). Other requests are sampled as
  before and get no replay.
- A replay opens from an alert, from an error in the log view, or from its trace ID.
- The stepper moves forward and back one span at a time. A span can be pinned to compare two
  replays side by side.
- Payload fields that match the team's redaction rules are masked in the SDK, before they leave
  the service. Passwords, tokens and card numbers are masked by default.
- A replay can be shared with a link. The link works for members of the workspace.

## Availability

- SDKs: Node.js, Python and Go for backends, and the browser SDK. Ruby is planned for early 2027.
- Plans: Team keeps replays for 7 days, Business for 30 days. Trace replay is not on the Free
  plan.
- Price: included in Team ($29 per seat per month) and Business ($59 per seat per month), with
  no extra charge.
- Regions: US and EU.

## Beta

Trace replay was in private beta from September to November 2026 with 40 teams. Tessel Freight
took part and agreed to be quoted:

> "We had a checkout error that showed up twice a week and never in staging. With the replay we
> stepped through one failed request and found the retry that was sending a stale cart ID."
> Jonas Brandt, staff engineer, Tessel Freight

## Positioning notes

- We looked at Tracewell, Opsight and Lumen APM in November. None of them has anything like trace
  replay yet, and as far as we know nobody else in observability does either. We got here before
  the rest of the market.
- Audience: backend and full-stack engineers who are on call.
- Quote for the release, from Priya Raman, CTO: write one for her to approve.

## Links

- Docs: https://driftlog.example/docs/trace-replay
- Feature page: https://driftlog.example/features/trace-replay
- Press contact: press@driftlog.example
