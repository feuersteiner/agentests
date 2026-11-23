"""Issues the TLS certificates we manage for customers' domains."""

import hashlib
from dataclasses import dataclass
from datetime import date, timedelta

LIFETIME = timedelta(days=365)


@dataclass(frozen=True)
class Certificate:
    domain: str
    serial: str
    valid_from: date
    valid_until: date


def issue_certificate(domain: str, issued_on: date) -> Certificate:
    """Issue a certificate for `domain`, valid until the same date next year."""
    domain = domain.rstrip(".").lower()
    serial = hashlib.sha256(f"{domain}:{issued_on.isoformat()}".encode()).hexdigest()[:16]
    return Certificate(domain, serial, issued_on, issued_on + LIFETIME)
