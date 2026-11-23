# plover-web

The web app of Plover Rota, which small teams use to plan their shift rotas. This repository
holds the accounts, teams and support tools; the rota planner itself lives in `plover-planner`.

It needs only the Python standard library. `app/web.py` is a small request and response layer
in the style of Flask, and `app/db.py` keeps the data in memory in place of Postgres.

## Layout

- `app/__init__.py`: `create_app()`, which wires the views together.
- `app/web.py`: `Request`, `Response`, `Blueprint`, `App` and `url_for`.
- `app/config.py`: settings, read from the environment.
- `app/auth.py`: sign-up, log-in, sessions and password reset.
- `app/teams.py`: teams, members and invitations.
- `app/admin.py`: support tools for Plover staff.
- `app/mail.py`: `send_mail(to, subject, body)`.
- `app/tokens.py`: signed, expiring tokens.
- `app/db.py`: users, teams, memberships, invitations and sessions.
- `deploy/`: the settings of each environment.
- `tests/`: the pytest suite.

## Routes

| Method | Path                                | What it does                                     |
| ------ | ----------------------------------- | ------------------------------------------------ |
| POST   | `/signup`                           | Create an account and start a session            |
| POST   | `/login`                            | Start a session                                  |
| POST   | `/logout`                           | End the session                                  |
| GET    | `/reset-password?token=...`         | The form to choose a new password                |
| POST   | `/reset-password`                   | Set a new password with a reset token            |
| POST   | `/teams`                            | Create a team                                    |
| GET    | `/teams/<team_id>/members`          | A team's members and pending invitations         |
| POST   | `/teams/<team_id>/invitations`      | Invite someone to a team by email (owner only)   |
| POST   | `/admin/users/<user_id>/send-reset` | Email a user a password reset link (admins only) |

Requests that need a session send it as `Authorization: Bearer <session>`.

## Environments

| Environment | Address                          | Settings                        |
| ----------- | -------------------------------- | ------------------------------- |
| development | `http://localhost:8000`          | the defaults in `app/config.py` |
| staging     | `https://staging.ploverrota.com` | `deploy/staging.env`            |
| production  | `https://app.ploverrota.com`     | `deploy/production.env`         |

Both deployed environments run behind the load balancer. `SECRET_KEY` comes from the secret
store, never from these files.

## Tests

```sh
python3 -m pytest
```
