"""Issues the TLS certificates we manage for customers' domains."""

import hashlib
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Certificate:
    domain: str
    serial: str
    valid_from: date
    valid_until: date


def normalise_domain(domain: str) -> str:
    """Lower case, without a trailing dot: "Shop.Example.com." becomes "shop.example.com"."""
    return domain.strip().rstrip(".").lower()


def issue_certificate(domain: str, issued_on: date) -> Certificate:
    """Issue a certificate for `domain`, valid until the same date next year."""
    domain = normalise_domain(domain)
    serial = hashlib.sha256(f"{domain}:{issued_on.isoformat()}".encode()).hexdigest()[:16]
    valid_until = date(issued_on.year + 1, issued_on.month, issued_on.day)
    return Certificate(domain, serial, issued_on, valid_until)
