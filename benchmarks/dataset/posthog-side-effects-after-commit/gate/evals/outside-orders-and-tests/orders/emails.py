"""Emails to customers, sent through the mail relay."""

from store import config, http
from store.money import format_cents


def send(to: str, subject: str, body: str) -> None:
    """Hand one email to the mail relay."""
    http.post_json(config.MAIL_RELAY_URL, {"from": config.MAIL_FROM, "to": to, "subject": subject, "body": body})


def send_order_confirmation(order: dict, customer: dict) -> None:
    send(
        customer["email"],
        f"Your Fernbank Seeds order #{order['id']}",
        f"Hello {customer['name']},\n\n"
        f"Thank you for your order. We have it down as {format_cents(order['total_cents'])} "
        "and will pack it within two working days.\n\nFernbank Seeds",
    )
