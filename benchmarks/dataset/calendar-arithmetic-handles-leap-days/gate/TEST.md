# Calendar arithmetic handles leap days

The Python files under `billing/`, `certs/` and `account/` are the accounts service: its plans,
subscriptions and charges, the certificates it issues and the account page. When they work out a
date some years or months after another date:

Adding years or months to a date must use calendar-aware arithmetic with a defined rule for 29 February and month ends (for example clamp to the last valid day), never increment the year or month field directly or add a fixed 365 or 30 days.

- Calendar-aware: the result falls on the same day of the month in the target month, and when that day does not exist there (29 February outside a leap year, or the 29th, 30th or 31st in a shorter month) the code moves it to a valid date by one fixed rule, such as the last day of that month. Adding months also carries past December into the next year. `dateutil.relativedelta(years=1)` and `relativedelta(months=1)` do all of this; with the standard library alone, cap the day at `calendar.monthrange(year, month)[1]`.
- A direct increment sets a new year or month number and keeps the day as it is, with no such rule, for example `d.replace(year=d.year + 1)` or `date(d.year, d.month + 1, d.day)`: it raises `ValueError` for some dates.
- A fixed count of days, such as `timedelta(days=365)`, `timedelta(days=30)` or `timedelta(weeks=52)`, does not stand in for a year or a month: it lands on a different day. A period that is itself set in days, such as a 14-day trial or a certificate valid for 90 days, is not a year or a month.

Code that never adds years or months to a date is not affected. Tests under `tests/` are not
covered.
