# Duplicate Plus fee, 3 November 2026

## What happened

At 06:10 on 3 November the billing job ran twice after a deploy, and 4,812 Plus subscribers were
charged their £3 monthly fee two times. Both charges were taken from their Pennyjar balance.

## Impact

- 4,182 customers were charged £3 twice: £6 in all instead of £3.
- 11 of them went into their overdraft because of the second charge, and were charged overdraft
  interest for between one and three days.

## Fix

- The deploy restarted the billing job without its lock. The lock is back, and the job now checks
  for an earlier charge in the same month before it takes a fee.
- Every second charge was refunded to the customer's Pennyjar balance on 5 November, with the
  overdraft interest it caused. Customers do not need to do anything.

## Customer contact

- 3 November: an in-app notice said we were looking into double charges for Plus.
- A follow-up email to every affected customer is still to be written.
