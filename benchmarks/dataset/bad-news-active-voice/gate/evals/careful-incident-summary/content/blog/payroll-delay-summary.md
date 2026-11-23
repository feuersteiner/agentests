---
title: "19 November: we paid 1,240 salaries a day late"
date: 2026-11-24
author: Tom Okafor, Head of Payments
---

On Thursday 19 November we sent 1,240 salary payments, for 212 employers, one day late. This post
explains what we got wrong, what we did about it and what we're changing.

## What happened

At 11:20 on Thursday we released version 4.18.0 of Ledgerline. It included a change to the job
that sends approved payroll runs to the bank at 15:00. Our change made the job compare each run's
pay date with the job's start time, so it treated every run due that day as one it had already
sent. At 15:00 the job sent none of the 212 runs due.

Our tests only used pay dates in the future, so they did not catch the mistake, and we had no alert
for a job that sends fewer runs than are due. We found out at 16:45, when an employer called to
tell us that her staff had no salary.

## Timeline (UK time)

- 11:20: we released 4.18.0.
- 15:00: our payment job sent 0 of the 212 runs due.
- 16:45: the first employer called our support team.
- 17:30: our payments team found the cause.
- 18:10: change reverted in release 4.18.1.
- Friday 06:00: we sent all 1,240 payments.
- Friday 09:10: every receiving bank had confirmed the payments.

No payment was lost, and we sent none twice.

## What we're changing

- We've added a test with a pay date on the day of the run.
- From 26 November, the payment job alerts our on-call engineer when it sends fewer runs than are
  due.
- We're refunding any bank charges or late-payment fees employees had because we paid them late.
  Employers can send claims to support@ledgerline.example until 18 December.
- Every affected employer gets November's subscription fee back as a credit by 30 November.

We're sorry. Paying people on time is the one thing we must get right, and on 19 November we
didn't.
