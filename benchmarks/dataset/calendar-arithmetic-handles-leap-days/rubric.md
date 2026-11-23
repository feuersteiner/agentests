# Rubric: calendar arithmetic handles leap days

## The rule

Adding years or months to a date must use calendar-aware arithmetic with a defined rule for 29 February and month ends (for example clamp to the last valid day), never increment the year or month field directly or add a fixed 365 or 30 days.

- Calendar-aware: the result falls on the same day of the month in the target month, and when that day does not exist there (29 February outside a leap year, or the 29th, 30th or 31st in a shorter month) the code moves it to a valid date by one fixed rule, such as the last day of that month. Adding months also carries past December into the next year. `dateutil.relativedelta(years=1)` and `relativedelta(months=1)` do all of this; with the standard library alone, cap the day at `calendar.monthrange(year, month)[1]`.
- A direct increment sets a new year or month number and keeps the day as it is, with no such rule, for example `d.replace(year=d.year + 1)` or `date(d.year, d.month + 1, d.day)`: it raises `ValueError` for some dates.
- A fixed count of days, such as `timedelta(days=365)`, `timedelta(days=30)` or `timedelta(weeks=52)`, does not stand in for a year or a month: it lands on a different day. A period that is itself set in days, such as a 14-day trial or a certificate valid for 90 days, is not a year or a month.

## What to look at

Grade the code the diff adds or changes under `billing/`, `certs/` and `account/`. Before the diff
no code there added years or months to a date: `next_renewal_date` raised `NotImplementedError`,
certificates were valid for a fixed 90 days, and there was no monthly billing and no trial date.
The 90-day certificate lifetime was a period set in days; replacing it with "one year" makes it a
year, which the rule then covers.

Find every place the diff computes a date some years or months after another date, such as a
renewal, a certificate's expiry, the next monthly charge or a trial's end, and ask of each:

1. **No fixed day count.** Is a year or a month written as 365, 366, 30 or 31 days, or 52 weeks,
   directly or through a constant? Then it fails, even though it never raises.
2. **No bare field increment.** Does it set the year or month number and keep the day, as in
   `replace(year=d.year + 1)`, `replace(month=d.month + 1)` or `date(y + 1, m, d)`? Then it fails
   unless the same code also handles a day the target month lacks.
3. **A defined rule for missing days.** Trace 29 February plus one year, 31 January plus one month,
   and 31 March plus one month. Each must give a valid date chosen by one rule: clamping to the
   month's last day, `relativedelta`, or another stated rule such as moving to 1 March. Raising
   an error, returning `None` or skipping the date is no rule. Adding months must also handle a
   start in December.

Tests the agent adds count in its favour only as a sign of care: a test for 29 February or a month
end that passes because the code is right. A test that the code would fail does not rescue it.
Ignore style, naming, where the helper lives and whether `dateutil` or the standard library is used.
Then check each numbered step of the task: the other steps count only toward whether the task is
done, never toward the rule.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the new date arithmetic uses a bare field increment or a fixed 365 or 30 days.
- **4 to 6**: years are handled but months are not (or the reverse), one of two new computations
  complies and the other does not, or the missing day is caught but turned into no valid date.
- **7 to 9**: every new computation complies, with a minor lapse or a step of the task skipped.
- **10**: the task is fully done, and every new computation is calendar-aware with a defined rule.

What each looks like:

- **2**: `valid_until = issued_on.replace(year=issued_on.year + 1)`, which raises on 29 February;
  or `LIFETIME = timedelta(days=365)`; or the next charge as `last_charge + timedelta(days=30)`.
- **5**: the next charge as `replace(month=d.month + 1)` with December handled but not the 31st;
  or a year handled with `try`/`except ValueError` that returns `None`; or a careful renewal beside
  a trial date of `signed_up_on + timedelta(days=365)`.
- **8**: every new computation clamps correctly, but the month addition is written out by hand
  with no test for the month ends; or all is right and one step of the task was skipped.
- **10**: `relativedelta(years=1)`, or a helper that caps the day at
  `calendar.monthrange(year, month)[1]` and carries months into the next year, in every place the
  task needed, with every step of the task done.
