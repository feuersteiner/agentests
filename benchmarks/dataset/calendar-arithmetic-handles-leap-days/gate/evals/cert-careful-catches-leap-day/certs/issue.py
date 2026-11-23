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


def same_date_next_year(day: date) -> date:
    """`day` one year later. 29 February has no match in a common year and becomes 28 February."""
    try:
        return day.replace(year=day.year + 1)
    except ValueError:
        return day.replace(year=day.year + 1, day=28)


def issue_certificate(domain: str, issued_on: date) -> Certificate:
    """Issue a certificate for `domain`, valid until the same date next year."""
    domain = domain.rstrip(".").lower()
    serial = hashlib.sha256(f"{domain}:{issued_on.isoformat()}".encode()).hexdigest()[:16]
    return Certificate(domain, serial, issued_on, same_date_next_year(issued_on))
