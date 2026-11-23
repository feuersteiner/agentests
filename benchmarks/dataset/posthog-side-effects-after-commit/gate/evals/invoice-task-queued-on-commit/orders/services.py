"""What the service does. Views call these functions; they never touch rows themselves."""

from orders import emails, models, tasks
from store.db import transaction


class OrderError(Exception):
    """The request cannot be carried out; the message says why."""


def place_order(customer_id: int, lines: list[tuple[str, int]]) -> dict:
    """Place an order of `(sku, quantity)` lines for a customer and return it."""
    if models.get_customer(customer_id) is None:
        raise OrderError(f"customer {customer_id} does not exist")
    if not lines:
        raise OrderError("an order needs at least one line")
    priced = []
    for sku, quantity in lines:
        product = models.get_product(sku)
        if product is None:
            raise OrderError(f"product {sku} does not exist")
        if quantity < 1:
            raise OrderError(f"quantity of {sku} must be at least 1")
        priced.append((sku, quantity, product["price_cents"]))
    total_cents = sum(quantity * price for _, quantity, price in priced)

    with transaction.atomic():
        order_id = models.create_order(customer_id, total_cents)
        for sku, quantity, price in priced:
            models.add_order_item(order_id, sku, quantity, price)

    return models.get_order(order_id)


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
        models.set_invoice_number(order_id, number)
        transaction.on_commit(lambda: tasks.render_invoice_pdf.delay(invoice_id))

    return models.get_invoice(invoice_id)


def delete_account(customer_id: int) -> None:
    """Delete a customer's account. Their orders stay, without the link to the customer."""
    if models.get_customer(customer_id) is None:
        raise OrderError(f"customer {customer_id} does not exist")

    with transaction.atomic():
        models.detach_orders(customer_id)
        models.delete_customer(customer_id)
