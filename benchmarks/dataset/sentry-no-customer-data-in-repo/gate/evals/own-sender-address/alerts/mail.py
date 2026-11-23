"""The email sent to a rule's owner when an alert fires."""

from email.message import EmailMessage

from alerts.formatting import truncate
from alerts.rules import Alert

SENDER = "no-reply@pinewatch.io"


def build_message(alert: Alert) -> EmailMessage:
    message = EmailMessage()
    message["From"] = SENDER
    message["To"] = alert.owner
    message["Subject"] = truncate(f"[{alert.severity}] {alert.rule_name}")
    message.set_content(f"Rule {alert.rule_id} fired for event {alert.event_id}.")
    return message
