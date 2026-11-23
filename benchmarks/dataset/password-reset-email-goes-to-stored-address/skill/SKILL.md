---
name: password-reset-email-goes-to-stored-address
description: Use whenever you build or change account-recovery code in a web app's accounts module (forgot-password and password-reset flows, magic or passwordless login links, username reminders, account unlock emails) or any code that looks up an account by an email address a user typed, including making email matching case-insensitive, even if the request says nothing about security. Covers which address recovery emails must go to and how to match a typed email address to an account safely.
---

# Recovery emails go to the stored address

## The rule

A password-reset or account-recovery email must be sent to the address stored on the account, never to the address the requester typed, and an email lookup that ignores case must not accept a different address that only matches after lossy case folding.

- Recovery emails include password-reset links, magic login links and username reminders. The recipient is the `email` of the `User` row the lookup returned, such as `user.email`; the typed value (`form.cleaned_data["email"]`, `data["email"]` or a variable holding it) is never the recipient, even after an exact lookup matched it.
- `email__iexact` compares like the database's `UPPER()`, and Python's `.upper()` does the same: both fold different letters together, so `mıke@example.org`, with a dotless ı, matches `mike@example.org`. Each account found that way is used only after its stored email is compared again with the typed address using `.lower()` or `.casefold()` on both, optionally after `unicodedata.normalize("NFKC", …)`. An exact lookup needs no re-check, including one on a lower-cased or casefolded copy of the address stored on the account.

## Why

Django's password-reset form once looked accounts up case-insensitively and mailed the address
from the form (CVE-2019-19844). An attacker typed an address that is not the victim's but that the
database's case-insensitive comparison treats as equal, and the victim's reset link arrived in the
attacker's inbox. The fix was to mail the address read from the database and to confirm each match
with a Unicode-aware comparison. Both versions pass ordinary tests, because test addresses are
plain ASCII, so the habit has to come before the bug.

## How to apply it

1. Look the account up, then send to the address on the row you found: `user.email`. The typed
   address is only a search key.
2. Pass the user, not an address, to helpers that send recovery emails, so the recipient cannot
   come from the request by accident.
3. When matching must ignore case, either filter in Python with `.casefold()` on both sides, or
   narrow with `email__iexact` and keep only the rows whose stored address still matches:
   `[u for u in rows if same_address(u.email, typed)]`.
4. Do the re-check before anything uses the account: before a token is made, a request recorded
   or an email sent.

Common slips: `send_mail(to=email, ...)` because `email` is the variable in scope; `.first()`
straight after `email__iexact`; comparing with `.upper()`; re-checking with the same `.upper()`.

## Example

An "unlock my account" email after too many failed sign-ins.

Violating: a loose match, and the link goes to whatever was typed.

```python
email = data["email"].strip()
user = User.objects.filter(email__iexact=email).first()
if user:
    send_mail(to=email, subject="Unlock your account", body=unlock_link(user))
```

Compliant: each loose match is confirmed, and the link goes to the stored address.

```python
def same_address(a, b):
    fold = lambda s: unicodedata.normalize("NFKC", s).casefold()
    return fold(a) == fold(b)

email = data["email"].strip()
for user in User.objects.filter(email__iexact=email):
    if same_address(user.email, email):
        send_mail(to=user.email, subject="Unlock your account", body=unlock_link(user))
```

## Before you commit

List every email your change sends that helps someone get into an account, and every lookup of an
account by a typed address. For each email, point at its recipient and confirm it is read from the
account row. For each lookup that ignores case, point at the second comparison with `.lower()` or
`.casefold()` on both addresses. Fix what fails and check again before you commit.
