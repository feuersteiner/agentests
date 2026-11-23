---
name: calendar-arithmetic-handles-leap-days
description: Use whenever you write or change Python code under billing/, certs/ or account/ that works out a date a number of years or months after another date, for example a renewal or anniversary date, an expiry or valid-until date, the next monthly or yearly charge, or the end of a trial or contract, even if the request does not mention leap years or month ends. Covers 29 February, the 29th to 31st of a month, and fixed day counts such as 365 or 30 days.
---

# Calendar arithmetic handles leap days

## The rule

Adding years or months to a date must use calendar-aware arithmetic with a defined rule for 29 February and month ends (for example clamp to the last valid day), never increment the year or month field directly or add a fixed 365 or 30 days.

- Calendar-aware: the result falls on the same day of the month in the target month, and when that day does not exist there (29 February outside a leap year, or the 29th, 30th or 31st in a shorter month) the code moves it to a valid date by one fixed rule, such as the last day of that month. Adding months also carries past December into the next year. `dateutil.relativedelta(years=1)` and `relativedelta(months=1)` do all of this; with the standard library alone, cap the day at `calendar.monthrange(year, month)[1]`.
- A direct increment sets a new year or month number and keeps the day as it is, with no such rule, for example `d.replace(year=d.year + 1)` or `date(d.year, d.month + 1, d.day)`: it raises `ValueError` for some dates.
- A fixed count of days, such as `timedelta(days=365)`, `timedelta(days=30)` or `timedelta(weeks=52)`, does not stand in for a year or a month: it lands on a different day. A period that is itself set in days, such as a 14-day trial or a certificate valid for 90 days, is not a year or a month.

## Why

"The same date next year" passes every test written on a mid-month date and fails on one day in
1,461. On 29 February 2012 Azure's guest agent computed a certificate's valid-to date by adding one
to the year. February 29, 2013 does not exist, certificate creation failed, new virtual machines
could not start, and the failures spread into a broad Windows Azure outage. Adding 365 days never
raises, but it drifts: from 1 March 2027 it lands on 29 February 2028, a day early. Thirty days
from 31 January 2027 is 2 March, not a day in February.

## How to apply it

1. Use `relativedelta` when `dateutil` is available. Otherwise write one helper and use it
   everywhere:

   ```python
   import calendar
   from datetime import date

   def add_months(day: date, months: int) -> date:
       """`months` later; a day the target month lacks becomes its last day."""
       year, month_index = divmod(day.month - 1 + months, 12)
       year += day.year
       month = month_index + 1
       return day.replace(year=year, month=month,
                          day=min(day.day, calendar.monthrange(year, month)[1]))
   ```

   Years are `add_months(day, 12 * years)`.
2. Say the rule in the docstring: 29 February plus a year is 28 February; 31 January plus a month
   is the last day of February.
3. Test the edges, not only mid-month: 29 February 2028 plus one year, 31 January plus one month
   in a leap and a common year, 31 March plus one month, and a start in December.

## Example

An insurance policy's end date, one year after it starts.

Violating: raises `ValueError` for a policy that starts on 29 February.

```python
def policy_end(starts_on: date) -> date:
    return starts_on.replace(year=starts_on.year + 1)
```

Also violating: never raises, but a policy starting on 1 March 2027 ends on 29 February 2028.

```python
POLICY_TERM = timedelta(days=365)
```

Compliant: one year later, with 29 February clamped to 28 February.

```python
def policy_end(starts_on: date) -> date:
    return add_months(starts_on, 12)  # 2028-02-29 -> 2029-02-28
```

## Before you commit

Read the staged diff once more. For every date computed as years or months after another, check
that it uses `relativedelta` or the clamping helper, not `replace(year=...)`, `replace(month=...)`
or a `timedelta` of 365 or 30 days, and work out 29 February and 31 January by hand. Fix what is
wrong, then check again.
