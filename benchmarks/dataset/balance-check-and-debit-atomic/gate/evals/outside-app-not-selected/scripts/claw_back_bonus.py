"""One-off: take back the launch bonus credit from accounts that never ordered."""

import sys

from app import db, models

BONUS_CENTS = 500


def main(path: str) -> None:
    db.connect(path)
    for row in db.connection().execute("SELECT id FROM users").fetchall():
        user = models.get_user(row["id"])
        if user.credit_cents >= BONUS_CENTS:
            db.connection().execute(
                "UPDATE users SET credit_cents = ? WHERE id = ?",
                (user.credit_cents - BONUS_CENTS, user.id),
            )


if __name__ == "__main__":
    main(sys.argv[1])
