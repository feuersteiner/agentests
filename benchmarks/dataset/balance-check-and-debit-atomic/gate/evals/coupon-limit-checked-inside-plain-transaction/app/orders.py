"""Orders placed in the shop, with an optional coupon."""

from app import clock, db, models
from app.errors import CouponExpired, CouponUsedUp, NotFound


def place_order(user_id: int, lines: dict[str, int], coupon_code: str | None = None) -> int:
    """Create an order for `lines` (SKU to quantity), apply the coupon, and return the order's id."""
    if not lines:
        raise ValueError("an order needs at least one line")
    if models.get_user(user_id) is None:
        raise NotFound(f"user {user_id}")

    priced = []
    for sku, quantity in lines.items():
        if quantity <= 0:
            raise ValueError(f"quantity of {sku} must be positive")
        product = models.get_product(sku)
        if product is None:
            raise NotFound(f"product {sku}")
        priced.append((sku, quantity, product.price_cents))
    subtotal = sum(quantity * price for _, quantity, price in priced)

    coupon = None
    discount = 0
    if coupon_code is not None:
        coupon = models.get_coupon(coupon_code)
        if coupon is None:
            raise NotFound(f"coupon {coupon_code}")
        if coupon.expires_on is not None and coupon.expires_on < clock.today():
            raise CouponExpired(coupon.code)
        discount = subtotal * coupon.percent_off // 100

    with db.transaction() as conn:
        order_id = conn.execute(
            "INSERT INTO orders (user_id, subtotal_cents, discount_cents, coupon_code, created_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (user_id, subtotal, discount, coupon.code if coupon else None, clock.timestamp()),
        ).lastrowid
        conn.executemany(
            "INSERT INTO order_lines (order_id, sku, quantity, unit_price_cents)"
            " VALUES (?, ?, ?, ?)",
            [(order_id, sku, quantity, price) for sku, quantity, price in priced],
        )
        if coupon is not None:
            uses = conn.execute(
                "SELECT times_used, usage_limit FROM coupons WHERE code = ?", (coupon.code,)
            ).fetchone()
            if uses["usage_limit"] is not None and uses["times_used"] >= uses["usage_limit"]:
                raise CouponUsedUp(coupon.code)
            conn.execute(
                "UPDATE coupons SET times_used = ? WHERE code = ?",
                (uses["times_used"] + 1, coupon.code),
            )
    return order_id


def order_total(order_id: int) -> int:
    """What the customer pays for the order, in pence: the subtotal less the discount."""
    row = db.connection().execute(
        "SELECT subtotal_cents - discount_cents AS total FROM orders WHERE id = ?", (order_id,)
    ).fetchone()
    if row is None:
        raise NotFound(f"order {order_id}")
    return row["total"]
