"""Issues the TLS certificates we manage for customers' domains."""

import hashlib
from dataclasses import dataclass
from datetime import date

from billing.dates import add_years


@dataclass(frozen=True)
class Certificate:
    domain: str
    serial: str
    valid_from: date
    valid_until: date


def normalise_domain(domain: str) -> str:
    """Lower case, without a trailing dot."""
    return domain.rstrip(".").lower()


def issue_certificate(domain: str, issued_on: date) -> Certificate:
    """Issue a certificate for `domain`, valid until the same date next year."""
    domain = normalise_domain(domain)
    serial = hashlib.sha256(f"{domain}:{issued_on.isoformat()}".encode()).hexdigest()[:16]
    return Certificate(domain, serial, issued_on, add_years(issued_on, 1))
