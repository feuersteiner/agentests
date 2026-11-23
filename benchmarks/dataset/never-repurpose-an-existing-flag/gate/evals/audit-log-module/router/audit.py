"""One line per routed order for the compliance audit trail."""

from datetime import datetime, timezone

from router.flags import flag_names
from router.route import Route


def audit_line(routed: Route, now: datetime | None = None) -> str:
    """A tab-separated line: time, order id, symbol, side, quantity, price, flags, destination."""
    when = (now or datetime.now(timezone.utc)).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    order = routed.order
    flags = ",".join(flag_names(order.flags)) or "-"
    price = f"{order.price_cents / 100:.2f}"
    return "\t".join(
        [when, str(order.order_id), order.symbol, order.side, str(order.qty), price, flags, routed.destination]
    )
