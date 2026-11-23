# Cycle 12 status

Cycle 12 ran from 5 October to 13 November 2026. Cool-down runs until 27 November, and cycle 13
starts on 30 November. Written by Maya Chen on 13 November.

## Waitlist (Birch): shipped

Shipped to every studio on 11 November. When a class is full, clients can join its waitlist, and
the first person on it gets the spot when someone cancels. 214 studios turned it on in the first
two days.

## Calendar sync (Cedar): not shipped

Instructors connect their Google or Outlook calendar, see their classes in it, and busy times in
their own calendar block bookings at those times.

| Scope                                    | State    |
| ---------------------------------------- | -------- |
| Google connection and export of classes  | Done     |
| Outlook connection and export of classes | Done     |
| Busy times block bookings (Google)       | Done     |
| Outlook two-way sync                     | Not done |
| Conflicts with recurring classes         | Not done |

Outlook two-way sync is not done because Microsoft's change notifications drop events from shared
calendars, which the team found in week four. Conflict handling for recurring classes started in
week five.

Nothing of Calendar sync has shipped. The finished scopes are on the `calendar-sync` branch,
behind the `calendar_sync` flag, and they cannot ship on their own: without the conflict handling,
a recurring class that clashes with a busy time is booked twice. The team estimates the two
remaining scopes at about two more weeks.

## Small batch (Alder): all shipped

- Gift cards (two weeks): shipped 16 October.
- Receipt redesign (two weeks): shipped 30 October.
- Reschedule link in reminder emails (two weeks): shipped 12 November.
