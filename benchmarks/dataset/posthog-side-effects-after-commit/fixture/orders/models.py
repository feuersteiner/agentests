"""The functions that read and write rows. Each statement commits on its own unless a transaction is open."""

from store.db import connection


def _insert(sql: str, values: tuple) -> int:
    return connection().execute(sql, values).lastrowid


def _one(sql: str, values: tuple):
    row = connection().execute(sql, values).fetchone()
    return dict(row) if row else None


def _all(sql: str, values: tuple) -> list[dict]:
    return [dict(row) for row in connection().execute(sql, values).fetchall()]


# Customers, their saved addresses and their carts


def create_customer(email: str, name: str) -> int:
    return _insert("INSERT INTO customers (email, name) VALUES (?, ?)", (email, name))


def get_customer(customer_id: int):
    return _one("SELECT * FROM customers WHERE id = ?", (customer_id,))


def delete_customer(customer_id: int) -> None:
    connection().execute("DELETE FROM customers WHERE id = ?", (customer_id,))


def add_address(customer_id: int, line1: str, postcode: str) -> int:
    return _insert(
        "INSERT INTO addresses (customer_id, line1, postcode) VALUES (?, ?, ?)", (customer_id, line1, postcode)
    )


def list_addresses(customer_id: int) -> list[dict]:
    return _all("SELECT * FROM addresses WHERE customer_id = ?", (customer_id,))


def add_to_cart(customer_id: int, sku: str, quantity: int) -> int:
    return _insert("INSERT INTO carts (customer_id, sku, quantity) VALUES (?, ?, ?)", (customer_id, sku, quantity))


def list_cart(customer_id: int) -> list[dict]:
    return _all("SELECT * FROM carts WHERE customer_id = ?", (customer_id,))


# Products


def create_product(sku: str, name: str, price_cents: int, stock: int) -> None:
    connection().execute(
        "INSERT INTO products (sku, name, price_cents, stock) VALUES (?, ?, ?, ?)", (sku, name, price_cents, stock)
    )


def get_product(sku: str):
    return _one("SELECT * FROM products WHERE sku = ?", (sku,))


def change_stock(sku: str, by: int) -> None:
    """Add `by` to the product's stock; a negative number takes stock away."""
    connection().execute("UPDATE products SET stock = stock + ? WHERE sku = ?", (by, sku))


# Orders


def create_order(customer_id: int, total_cents: int) -> int:
    return _insert(
        "INSERT INTO orders (customer_id, status, total_cents) VALUES (?, 'placed', ?)", (customer_id, total_cents)
    )


def add_order_item(order_id: int, sku: str, quantity: int, unit_price_cents: int) -> int:
    return _insert(
        "INSERT INTO order_items (order_id, sku, quantity, unit_price_cents) VALUES (?, ?, ?, ?)",
        (order_id, sku, quantity, unit_price_cents),
    )


def get_order(order_id: int):
    return _one("SELECT * FROM orders WHERE id = ?", (order_id,))


def list_order_items(order_id: int) -> list[dict]:
    return _all("SELECT * FROM order_items WHERE order_id = ?", (order_id,))


def set_order_status(order_id: int, status: str) -> None:
    connection().execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))


def detach_orders(customer_id: int) -> None:
    """Keep a deleted customer's orders, without the link to the customer."""
    connection().execute("UPDATE orders SET customer_id = NULL WHERE customer_id = ?", (customer_id,))


# Payments


def create_payment(order_id: int, amount_cents: int, provider_reference: str | None = None) -> int:
    return _insert(
        "INSERT INTO payments (order_id, amount_cents, status, provider_reference) VALUES (?, ?, 'pending', ?)",
        (order_id, amount_cents, provider_reference),
    )


def get_payment(order_id: int):
    return _one("SELECT * FROM payments WHERE order_id = ?", (order_id,))


def set_payment_status(payment_id: int, status: str) -> None:
    connection().execute("UPDATE payments SET status = ? WHERE id = ?", (status, payment_id))


# Invoices


def count_invoices() -> int:
    return connection().execute("SELECT COUNT(*) FROM invoices").fetchone()[0]


def create_invoice(order_id: int, number: str) -> int:
    return _insert("INSERT INTO invoices (order_id, number) VALUES (?, ?)", (order_id, number))


def get_invoice(invoice_id: int):
    return _one("SELECT * FROM invoices WHERE id = ?", (invoice_id,))
