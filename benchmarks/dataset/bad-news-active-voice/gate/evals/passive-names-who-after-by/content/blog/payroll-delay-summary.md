---
title: What went wrong with salaries on 19 November
date: 2026-11-24
author: Tom Okafor, Head of Payments
---

On Thursday 19 November, 1,240 salary payments were sent a day late by Ledgerline. A change we
released that morning stopped our payment job from sending the runs due that day, and we sent all
1,240 payments at 06:00 on Friday.

We've reverted the change and added a test for it, and from 26 November the job alerts our on-call
engineer when it sends fewer runs than are due. We're refunding any bank charges employees had
because we paid them late.

We're sorry.
