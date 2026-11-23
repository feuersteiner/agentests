"""Issues the TLS certificates we manage for customers' domains."""

import hashlib
from dataclasses import dataclass
from datetime import date, timedelta

# Browsers reject a publicly trusted certificate valid for more than 397 days, so that is the
# lifetime, counted in days.
LIFETIME_DAYS = 397


@dataclass(frozen=True)
class Certificate:
    domain: str
    serial: str
    valid_from: date
    valid_until: date


def issue_certificate(domain: str, issued_on: date) -> Certificate:
    """Issue a certificate for `domain`, valid for 397 days from `issued_on`."""
    domain = domain.rstrip(".").lower()
    serial = hashlib.sha256(f"{domain}:{issued_on.isoformat()}".encode()).hexdigest()[:16]
    return Certificate(domain, serial, issued_on, issued_on + timedelta(days=LIFETIME_DAYS))
