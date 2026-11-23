"""The errors the billing service raises to its callers."""


class BillingError(Exception):
    """Base class of every error the service reports to a caller."""


class NotFound(BillingError):
    """The user, invoice, product, coupon or gift card does not exist."""


class CouponExpired(BillingError):
    """The coupon's expiry date has passed."""
