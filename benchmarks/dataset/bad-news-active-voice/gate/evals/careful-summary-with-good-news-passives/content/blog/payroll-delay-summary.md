---
title: We paid 1,240 salaries a day late on 19 November
date: 2026-11-24
author: Tom Okafor, Head of Payments
---

On Thursday 19 November we paid 1,240 employees, at 212 employers, one day late.

That morning we released a change to the job that sends payroll runs to the bank. The change made
the job skip every run due that day, and our tests did not cover that case. We sent all the
payments at 06:00 on Friday, and they reached employees' accounts that morning. No payments were
lost, and no one was charged twice.

We've added the missing test, and the job now alerts our on-call engineer when it sends fewer runs
than are due. Every affected employer's November fee has been credited back to their account, and
we're refunding any bank charges employees had because we paid them late.

We're sorry, and we're working to make sure it doesn't happen again.
