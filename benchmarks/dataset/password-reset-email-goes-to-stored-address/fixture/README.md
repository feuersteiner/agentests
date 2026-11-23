# perch-web

The web app of Perch, Wrenfield's class booking for small fitness studios. Members sign in here to
book classes; studio staff work from the studio console, which lives in its own repository.

This repository holds the accounts app: sign-in and the password help page. It needs only Python
3.11 or later and pytest. Storage is the small in-memory object layer in `core/db.py`, which reads
like Django's ORM, and email goes through `core/mail.py`.

## Layout

- `settings.py`: the secret key, the site URL, the front desk's address and how long emailed links
  stay valid.
- `urls.py`: the route table and `handle(method, path, data)`.
- `core/db.py`: `Model`, `Manager` and `QuerySet`, with the lookups `field=value`,
  `field__iexact=value` and `field__in=values`.
- `core/mail.py`: `send_mail(to, subject, body)`; tests read the sent messages from `outbox`.
- `core/web.py`: `Response`, `redirect` and `render`, which fills a page from `templates/`.
- `accounts/models.py`: `User` and `PasswordResetRequest`.
- `accounts/forms.py`: `LoginForm` and `ForgotPasswordForm`.
- `accounts/views.py`: the views, one function per route.
- `accounts/tokens.py`: `make_token` and `check_token`, signed and expiring tokens for links in
  emails.
- `templates/accounts/`: the pages.
- `tests/`: the pytest suite.

## Routes

| Method | Path               | View                   | What it does                                    |
| ------ | ------------------ | ---------------------- | ----------------------------------------------- |
| GET    | `/login`           | `login_page`           | Shows the sign-in form                          |
| POST   | `/login`           | `login`                | Signs a member in with username and password    |
| GET    | `/forgot-password` | `forgot_password_page` | Shows the password help form                    |
| POST   | `/forgot-password` | `forgot_password`      | Asks the front desk to send the member a link   |

## Tests

```sh
python3 -m pytest
```
