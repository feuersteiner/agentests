# Report: calendar-arithmetic-handles-leap-days

Status: done. The entry is at `benchmarks/dataset/calendar-arithmetic-handles-leap-days/`.

- `loadEntry` passes.
- `validate` passes with the final `gate/` installed in a fresh copy of the fixture.
- The fixture's 10 pytest tests pass as shipped, and no caches are left.
- The skill has no unescaped `$` (`findSkillPlaceholders` returns `[]`).
- The rule text appears nowhere in `fixture/`. A grep of the fixture for `leap`, `29 February`, `monthrange`, `relativedelta` and `calendar-aware` finds nothing.
- Only this entry's folder is new in the repository. The other untracked dataset folders belong to other workers.

I ran 3 proving rounds. The last one matched every eval on both models: luna 30/30, jev 30/30.

## Final rule text

Adding years or months to a date must use calendar-aware arithmetic with a defined rule for 29 February and month ends (for example clamp to the last valid day), never increment the year or month field directly or add a fixed 365 or 30 days.

- Calendar-aware: the result falls on the same day of the month in the target month, and when that day does not exist there (29 February outside a leap year, or the 29th, 30th or 31st in a shorter month) the code moves it to a valid date by one fixed rule, such as the last day of that month. Adding months also carries past December into the next year. `dateutil.relativedelta(years=1)` and `relativedelta(months=1)` do all of this; with the standard library alone, cap the day at `calendar.monthrange(year, month)[1]`.
- A direct increment sets a new year or month number and keeps the day as it is, with no such rule, for example `d.replace(year=d.year + 1)` or `date(d.year, d.month + 1, d.day)`: it raises `ValueError` for some dates.
- A fixed count of days, such as `timedelta(days=365)`, `timedelta(days=30)` or `timedelta(weeks=52)`, does not stand in for a year or a month: it lands on a different day. A period that is itself set in days, such as a 14-day trial or a certificate valid for 90 days, is not a year or a month.

The first sentence is the research rule word for word. The verdict is `as-is`, with no `policy_facts`. The bullets define the three terms of the sentence from the research `near_miss` and `grading_note`.

The last bullet's day-period exception keeps a 14-day trial, a 30-day grace period or a 90-day certificate legal. Without it, any `timedelta` near a date would read as a violation. There are no case facts.

The bullets settle two things the research sentence leaves open:

- A `try`/`except ValueError` that picks a valid date counts as a defined rule, and so is not a bare increment.
- Carrying past December is part of calendar-aware month arithmetic.

## Fixture

`accounts-service` belongs to a fictional web host, Oakhurst Hosting. It is Python 3, standard library only, 17 files:

- `billing/plans.py`: `Plan`, two yearly-priced plans and `format_price`.
- `billing/subscriptions.py`: `Subscription` with `started_on`, and a stub `next_renewal_date` that raises `NotImplementedError`.
- `billing/schedule.py`: `Charge` and `first_charge`.
- `certs/issue.py`: `issue_certificate`, with `LIFETIME = timedelta(days=90)`. This is a period set in days, so it complies.
- `account/page.py`: `Account` and `render_account_page`, with a "Member since" row.
- `__init__.py` files, the README, a CHANGELOG, `pyproject.toml` and `.gitignore`.
- `tests/`: five pytest files on fixed mid-month dates.

No existing code adds years or months.

Seeded chores for the other steps:

- `format_price` pads the pence on the wrong side: 4805 comes out as "£48.50".
- `customer_email` is not lowercased.
- Domains are not normalised.
- Name and email are not HTML-escaped on the account page.
- The README's test command says `tests/unit`.
- The README notes the 90-day lifetime.

## Test (gate/test.yaml, frozen after round 3)

The Test selects with glob `['billing/**/*.py', 'certs/**/*.py', 'account/**/*.py']` and the select grep `[Yy]ear|YEAR|[Mm]onth|MONTH|timedelta|\b[Dd]ays?\b|DAYS|[Ww]eeks?\b|WEEKS|ordinal|\b36[56]\b`.

1. `new-year-or-month-handles-missing-days`, grep `year|month`.
   - Decide: the code never makes a later date by adding to a date's year or month number while keeping the same day, as in `d.replace(year=d.year + 1)`, `d.replace(month=d.month + 1)` or `date(d.year + 1, d.month, d.day)`, "wherever that appears in the file".
   - Exception: the same code also makes the day valid for the new month, by capping it at the month's last day (for example with `calendar.monthrange`) or by catching the `ValueError` and using a set valid date such as 28 February or 1 March.
   - Returning `None`, raising an error or skipping the date does not count.
   - Code passes when it uses `relativedelta`, calls a function defined in another file, or only reads or prints a year or month.
2. `no-fixed-days-for-a-year-or-month`, grep `timedelta|[Dd]ays\s*=|ordinal|86_?400|\b36[56]\b|\b3[01]\b|\b52\b`.
   - Decide: the code never adds a fixed number of days to a date in place of a year or a month.
   - That happens when it adds 365, 366, 30 or 31 days, or 52 weeks, and its names, comments or docstrings call the period or the result a year, a month, annual, yearly, monthly, 12 months, next year or next month. 365 or 366 days, or 52 weeks, with no description also counts as a year.
   - These pass: a period the code itself describes in days (a 14-day trial, a 30-day grace period, a certificate valid for 90 days), subtracting days, and adding no days.
3. `month-addition-carries-into-next-year`, grep `month`.
   - Decide: if the code adds to a month number (`d.month + 1`, `d.month + n`), it handles a result past December by moving into the next year, for example with `divmod(d.month - 1 + n, 12)` or an `if month > 12` check.
   - Code that does not add to a month number passes: code that uses `relativedelta`, calls a function defined in another file, adds only years or days, or only reads or prints a month.

No criterion carries company policy, so another company's file passes on the same terms. The eval `other-product-billing-with-day-periods` checks this.

On this fixture, only posthog-branching-decision-is-pure's fixture has files my glob selects (`billing/`). My Test selects its `billing/service.py`, so the companion picker never pairs the two. Each of my four tasks gets 9 companions.

## Evals (30) and expectations

**Fail**, 13 evals. Each fails exactly its intended assertion on both models in round 3.

- Assertion 1:
  - `renewal-careless-replace-year`
  - `renewal-careless-loop-bumps-year` (a `while` loop with `date(y + 1, m, d)`)
  - `renewal-except-returns-none`
  - `cert-careless-replace-year` (the Azure bug, constructor form)
  - `monthly-careless-new-month-number-same-day` (handles December but not the 31st)
  - `trial-careless-next-year-same-day`
- Assertion 2:
  - `renewal-careless-365-days`
  - `cert-careless-365-day-lifetime`
  - `monthly-careless-30-days`
  - `trial-careless-365-days`
- Assertion 3:
  - `monthly-day-capped-but-december-not-carried`

**Pass**, 15 evals.

- The careful way:
  - `shipped-files` (the fixture's eight files under `billing/`, `certs/` and `account/`, unchanged)
  - `renewal-careful-relativedelta`
  - `renewal-careful-clamp-helper`
  - `renewal-rolls-leap-day-to-march-first`
  - `cert-careful-catches-leap-day`
  - `cert-careful-relativedelta`
  - `cert-calls-date-helper-from-another-module`
  - `monthly-careful-clamped-to-month-end`
  - `monthly-careful-relativedelta-from-last-charge`
  - `trial-careful-relativedelta`
- Near misses about something else:
  - `cert-lifetime-set-in-days` (397 days)
  - `cert-renewal-window-set-in-days` (renew 30 days before expiry)
  - `dunning-grace-period-set-in-days`
  - `months-active-count-is-not-date-arithmetic`
  - `plans-monthly-prices-about-something-else`
  - `page-escaping-and-footer-year-about-something-else`
  - `other-product-billing-with-day-periods` (another company's billing file: 14-day trial and due date, "one month of their plan")

**Skip**, 2 evals.

- `tests-and-readme-not-selected` (violating code in `tests/`, and the README)
- `package-files-without-dates-skipped` (globbed, but no date words)

## Tasks and tempting tags

1. Renewal, `false`. "Renew exactly one year after they start" asks only for the work.
2. Certificates, `true`. "Valid until the same date next year" spells out the field increment `replace(year=year + 1)`, the Azure bug, and that date does not exist for 29 February.
3. Monthly billing, `true`. "The next charge is on the same day next month" spells out a month-field increment with the day kept, which fails for the 29th to 31st.
4. Trial end, `false`. "12 months after sign-up" asks only for the work.

Each prompt has 4 or 5 steps and runs 86 to 102 words. The researched prompt is step 2 or 3, word for word.

The other steps are the seeded chores, tests in `tests/`, README fixes, CHANGELOG lines and a version bump. Two steps touch selected files but add no date arithmetic:

- a monthly price field in `billing/plans.py` (task 3);
- an optional `company` row in `account/page.py` (task 4).

I did not change any researched prompt.

## Careless and careful, done by hand (task 2, all four steps, scratch copies)

**Careless.**

- What I changed: `valid_until = issued_on.replace(year=issued_on.year + 1)`, the 90-day test changed to the next year's date, the domain normalised, the README, version and CHANGELOG updated.
- Result: all 11 tests pass, but `issue_certificate(..., date(2028, 2, 29))` raises `ValueError: day is out of range for month`. The rule is broken and the shipped tests do not notice.
- The staged `certs/issue.py` reaches assertion 1, by the local glob and grep simulation. Its shape matches the evals `renewal-careless-replace-year` and `cert-careless-replace-year`, which fail on both models.

**Careful.**

- What I changed: a `same_date_next_year` helper that caps the day with `calendar.monthrange`, plus a leap-day test (29 Feb 2028 gives 28 Feb 2029).
- Result: 12 tests pass. Its shape matches `renewal-careful-clamp-helper`, which passes on both models.

I did not run the decision model on these two hand-made files: proofs are the only model calls allowed.

## Proving rounds

**Round 1**: luna 27/27, jev 27/27.

- Nothing to fix.
- Luna also failed assertion 1 on `renewal-careless-365-days`, though only assertion 2 should fail it. The eval still matched, because it expects fail.
- I added three evals for likely real patterns the set did not cover: a call to a date helper in another module, a year-bumping loop, and a renewal window in days in a file that mentions "next year".

**Round 2**: luna 29/30, jev 28/30. This round had the same Test as round 1, with the three new evals.

- luna failed `cert-renewal-window-set-in-days` on assertion 2.
- jev failed `cert-calls-date-helper-from-another-module` on assertion 1.
- jev passed `renewal-careless-loop-bumps-year`.

**Round 3**: luna 30/30, jev 30/30. I made three changes to `test.yaml`:

- Assertion 1 is rewritten as a prohibition ("never makes a later date by ... unless ..."), "wherever that appears in the file" is added, and code that calls a function defined in another file passes.
- Assertion 2 is rewritten to fail only when 365, 366, 30 or 31 days, or 52 weeks, are added and the code calls the result a year or a month (bare 365 or 366 days, or 52 weeks, still count as a year). A period the code itself describes in days passes, and subtracting days is not adding.
- Assertion 3 also passes code that calls a function defined in another file.

The last round has no mismatch, refusal or error. Round 3 is the best round, so nothing was restored. Copies of each round's `test.yaml` are in `/tmp/claude-0/-home-user-agentests/11f48509-e298-5a6e-b55d-a1db91b2e686/scratchpad/work/calendar-arithmetic-handles-leap-days/rounds/`. All three proof folders are deleted.

Last round, luna (`gpt-6-luna`): 30 of 30 match; 51 decision calls, 56266 input tokens, 0.0056 USD.
Last round, jev (`jev-latest`): 30 of 30 match; 51 decision calls, 62556 input and 1122 output tokens, 0.0026 USD.

Both models gave the same result on every eval:

| eval                                               | expected | luna | jev  |
| -------------------------------------------------- | -------- | ---- | ---- |
| cert-calls-date-helper-from-another-module         | pass     | pass | pass |
| cert-careful-catches-leap-day                      | pass     | pass | pass |
| cert-careful-relativedelta                         | pass     | pass | pass |
| cert-careless-365-day-lifetime                     | fail     | fail | fail |
| cert-careless-replace-year                         | fail     | fail | fail |
| cert-lifetime-set-in-days                          | pass     | pass | pass |
| cert-renewal-window-set-in-days                    | pass     | pass | pass |
| dunning-grace-period-set-in-days                   | pass     | pass | pass |
| monthly-careful-clamped-to-month-end               | pass     | pass | pass |
| monthly-careful-relativedelta-from-last-charge     | pass     | pass | pass |
| monthly-careless-30-days                           | fail     | fail | fail |
| monthly-careless-new-month-number-same-day         | fail     | fail | fail |
| monthly-day-capped-but-december-not-carried        | fail     | fail | fail |
| months-active-count-is-not-date-arithmetic         | pass     | pass | pass |
| other-product-billing-with-day-periods             | pass     | pass | pass |
| package-files-without-dates-skipped                | skip     | skip | skip |
| page-escaping-and-footer-year-about-something-else | pass     | pass | pass |
| plans-monthly-prices-about-something-else          | pass     | pass | pass |
| renewal-careful-clamp-helper                       | pass     | pass | pass |
| renewal-careful-relativedelta                      | pass     | pass | pass |
| renewal-careless-365-days                          | fail     | fail | fail |
| renewal-careless-loop-bumps-year                   | fail     | fail | fail |
| renewal-careless-replace-year                      | fail     | fail | fail |
| renewal-except-returns-none                        | fail     | fail | fail |
| renewal-rolls-leap-day-to-march-first              | pass     | pass | pass |
| shipped-files                                      | pass     | pass | pass |
| tests-and-readme-not-selected                      | skip     | skip | skip |
| trial-careful-relativedelta                        | pass     | pass | pass |
| trial-careless-365-days                            | fail     | fail | fail |
| trial-careless-next-year-same-day                  | fail     | fail | fail |

I changed no eval's files or expectation. Three evals were added after round 1, as described above.

## Research and triage that did not work as written

- **Selection.** The triage's `how` names `billing/*.py` and `certs/*.py`. Task 4 needs the account page, so the Test also selects `account/**/*.py`. It uses `**` so that helpers added in subfolders are covered.
- **`certs/issue.py`.** The research describes it as a stub that "issues a certificate valid for one year". That would already be the task, so I ship it valid for a fixed 90 days, a compliant period set in days. Task 2 then turns it into one year, and the obvious careless change is `timedelta(days=365)` or `replace(year=...)`.
- **`billing/schedule.py`.** The research lists it as "monthly charges". Task 3 adds monthly billing, so the file ships with only `Charge` and the first charge.
- **`dateutil`.** The research's compliant example uses `dateutil.relativedelta`. The fixture must not need network installs, so the fixture uses only the standard library. The skill shows a standard-library helper, and the rule text names both.

## Not verified

- No agent was run, and the decision model was not run on the hand-made careless and careful files. They are shaped like proven evals.
- Whether `dateutil` is installed where the benchmark runs. It imports on this machine. The fixture does not need it, but an agent may use it.
- Decisions are stochastic: one clean round 3 does not guarantee the same answers in a run. Round 2 showed jev can miss a year bump inside a loop under the earlier wording.
- A month addition chained from the previous charge (31 Jan, 28 Feb, 28 Mar) drifts. The rule text does not forbid this, so the Test accepts it and the rubric does not penalise it, and `monthly-careful-relativedelta-from-last-charge` expects pass.
