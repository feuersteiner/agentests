# Recovery emails go to the stored address

The Python modules under `accounts/` send the emails that help members back into their accounts
and look accounts up by the email address someone typed. In every one of them:

A password-reset or account-recovery email must be sent to the address stored on the account, never to the address the requester typed, and an email lookup that ignores case must not accept a different address that only matches after lossy case folding.

- Recovery emails include password-reset links, magic login links and username reminders. The recipient is the `email` of the `User` row the lookup returned, such as `user.email`; the typed value (`form.cleaned_data["email"]`, `data["email"]` or a variable holding it) is never the recipient, even after an exact lookup matched it.
- `email__iexact` compares like the database's `UPPER()`, and Python's `.upper()` does the same: both fold different letters together, so `mıke@example.org`, with a dotless ı, matches `mike@example.org`. Each account found that way is used only after its stored email is compared again with the typed address using `.lower()` or `.casefold()` on both, optionally after `unicodedata.normalize("NFKC", …)`. An exact lookup needs no re-check, including one on a lower-cased or casefolded copy of the address stored on the account.

Emails that are not recovery emails, such as a notice to a fixed staff address or a receipt, are
not covered. A module that sends no recovery email and does no case-insensitive email lookup has
nothing to check.
