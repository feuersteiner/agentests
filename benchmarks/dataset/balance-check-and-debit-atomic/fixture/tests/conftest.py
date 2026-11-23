import pytest

from app import db


@pytest.fixture(autouse=True)
def database():
    """A fresh in-memory database for every test, with two customers, invoices, products and coupons."""
    conn = db.connect(":memory:")
    conn.executemany(
        "INSERT INTO users (id, email, name, credit_cents) VALUES (?, ?, ?, ?)",
        [
            (1, "ada@example.com", "Ada Byron", 5000),
            (2, "bo@example.com", "Bo Lindqvist", 0),
        ],
    )
    conn.executemany(
        "INSERT INTO invoices (id, user_id, amount_cents, description, status) VALUES (?, ?, ?, ?, ?)",
        [
            (1, 1, 3000, "500 business cards", "open"),
            (2, 1, 8000, "Trade show banner", "open"),
            (3, 2, 1200, "Flyers, A5", "paid"),
        ],
    )
    conn.executemany(
        "INSERT INTO products (sku, name, price_cents) VALUES (?, ?, ?)",
        [
            ("CARD-500", "500 business cards", 3000),
            ("POSTER-A2", "A2 poster", 1500),
            ("STICKER-50", "50 stickers", 800),
        ],
    )
    conn.executemany(
        "INSERT INTO coupons (code, percent_off, usage_limit, times_used, expires_on) VALUES (?, ?, ?, ?, ?)",
        [
            ("SPRING10", 10, 100, 0, None),
            ("LAUNCH25", 25, 2, 1, None),
            ("OLD5", 5, None, 0, "2020-01-31"),
        ],
    )
    yield conn
