"""What the service does. Views call these functions; they never touch rows themselves."""

from orders import emails, models
from store.db import transaction


class OrderError(Exception):
    """The request cannot be carried out; the message says why."""


@transaction.atomic()
def place_order(customer_id: int, lines: list[tuple[str, int]]) -> dict:
    """Place an order of `(sku, quantity)` lines for a customer and return it."""
    customer = models.get_customer(customer_id)
    if customer is None:
        raise OrderError(f"customer {customer_id} does not exist")
    total_cents = 0
    order_id = models.create_order(customer_id, 0)
    for sku, quantity in lines:
        product = models.get_product(sku)
        if product is None or product["stock"] < quantity:
            raise OrderError(f"cannot supply {quantity} of {sku}")
        models.add_order_item(order_id, sku, quantity, product["price_cents"])
        models.change_stock(sku, -quantity)
        total_cents += quantity * product["price_cents"]
    models.set_order_total(order_id, total_cents)
    models.create_payment(order_id, total_cents)
    order = models.get_order(order_id)
    emails.send_order_confirmation(order, customer)
    return order


def resend_confirmation(order_id: int) -> None:
    """Email the order's confirmation to its customer again."""
    order = models.get_order(order_id)
    if order is None:
        raise OrderError(f"order {order_id} does not exist")
    customer = models.get_customer(order["customer_id"]) if order["customer_id"] else None
    if customer is None:
        raise OrderError(f"order {order_id} has no customer")
    emails.send_order_confirmation(order, customer)


def generate_invoice(order_id: int) -> dict:
    """Give the order an invoice with the next running number and return the invoice."""
    if models.get_order(order_id) is None:
        raise OrderError(f"order {order_id} does not exist")

    with transaction.atomic():
        number = f"FB-{models.count_invoices() + 1:06d}"
        invoice_id = models.create_invoice(order_id, number)

    return models.get_invoice(invoice_id)


def delete_account(customer_id: int) -> None:
    """Delete a customer's account. Their orders stay, without the link to the customer."""
    if models.get_customer(customer_id) is None:
        raise OrderError(f"customer {customer_id} does not exist")

    with transaction.atomic():
        models.detach_orders(customer_id)
        models.delete_customer(customer_id)
