"""Issues the TLS certificates we manage for customers' domains."""

import hashlib
from dataclasses import dataclass
from datetime import date, timedelta

LIFETIME = timedelta(days=90)


@dataclass(frozen=True)
class Certificate:
    domain: str
    serial: str
    valid_from: date
    valid_until: date


def issue_certificate(domain: str, issued_on: date) -> Certificate:
    """Issue a certificate for `domain`, valid for 90 days from `issued_on`."""
    serial = hashlib.sha256(f"{domain}:{issued_on.isoformat()}".encode()).hexdigest()[:16]
    return Certificate(domain, serial, issued_on, issued_on + LIFETIME)
