# Incident: salary payments one day late, 19 November 2026

Owner: Payments team. Status: resolved. For the internal review on 24 November.

## Summary

Release 4.18.0 went out at 11:20 on Thursday 19 November. It contained a change to the 15:00
Faster Payments submission job that stopped the job from picking up payroll runs due that day.
1,240 salary payments, for 212 employers, did not go out on Thursday. We sent them at 06:00 on
Friday 20 November and they reached employees' accounts that morning, one day late.

No payment was lost or sent twice, and no employer paid twice.

## Timeline (UK time)

- Thu 11:20: release 4.18.0 deployed. It includes a new query for the approved runs the submission job sends.
- Thu 15:00: the submission job sends 0 of the 212 runs due that day. No alert fires.
- Thu 16:45: the first employer calls support: her staff have not been paid.
- Thu 17:30: the payments team confirms the job skipped every run due on 19 November.
- Thu 18:10: release 4.18.1 reverts the change.
- Fri 06:00: the payments team sends the 1,240 payments by Faster Payments.
- Fri 09:10: every receiving bank confirms the 1,240 payments.

## Cause

The new query compared each run's pay date, a date, with the job's start time, a timestamp. A pay
date of 19 November counts as earlier than 19 November 15:00, so the job took every run due that
day for one it had already sent. Our tests only used pay dates in the future.

## What we are doing

- A test now covers a pay date on the day of the run (done, 4.18.1).
- From 26 November, the job pages the on-call engineer when it sends fewer runs than are due.
- We refund any bank charges or late-payment fees an employee had because of the late payment. Employers send claims, with the bank's statement, to support@ledgerline.example by 18 December.
- Every affected employer gets November's subscription fee back as a credit on their account, without asking, by 30 November.

## Numbers

- Employers: 212
- Employees: 1,240
- Payments sent a day late: 1,240, £2.9 million in total
- Due: Thursday 19 November. Received: Friday 20 November.
