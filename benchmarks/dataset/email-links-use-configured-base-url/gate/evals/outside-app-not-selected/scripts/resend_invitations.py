"""Resend every pending invitation, for when the mail relay was down. Run from the repository root."""

import sys

from app import tokens
from app.db import store
from app.mail import send_mail

host = sys.argv[1] if len(sys.argv) > 1 else "localhost:8000"

for invitation in store.invitations.values():
    if invitation.accepted_at is None:
        token = tokens.make_token("team-invitation", invitation.id)
        send_mail(
            invitation.email,
            "Your Plover Rota invitation",
            f"Accept it here: http://{host}/invitations/accept?token={token}\n",
        )
