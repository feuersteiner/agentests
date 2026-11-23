"""When we renew the certificates we manage.

A certificate is valid until the same date next year. We start renewing it 30 days before it
expires, so a failed renewal leaves time to fix the domain's DNS.
"""

from datetime import date, timedelta

from certs.issue import Certificate

RENEW_BEFORE = timedelta(days=30)


def renew_from(certificate: Certificate) -> date:
    """The first day we try to renew `certificate`."""
    return certificate.valid_until - RENEW_BEFORE


def due_for_renewal(certificates: list[Certificate], today: date) -> list[Certificate]:
    """The certificates whose renewal window has opened."""
    return [c for c in certificates if renew_from(c) <= today]
