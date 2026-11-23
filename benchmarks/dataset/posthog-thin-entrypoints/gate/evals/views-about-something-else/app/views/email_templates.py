"""The subject lines and bodies of the emails the shop sends."""

ORDER_CONFIRMED_SUBJECT = "Your Larkspur order {order_id} is confirmed"

ORDER_CONFIRMED_BODY = """\
Hello {name},

Thank you for your order. We will write again when it ships.

The Larkspur team
"""

ORDER_SHIPPED_SUBJECT = "Your Larkspur order {order_id} is on its way"
ORDER_DELAYED_SUBJECT = "UPDATE: your Larkspur order {order_id} is delayed"


def render(template: str, **values: str) -> str:
    return template.format(**values)
