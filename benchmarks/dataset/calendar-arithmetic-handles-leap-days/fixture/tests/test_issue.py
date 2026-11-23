from datetime import date

from certs.issue import issue_certificate


def test_certificate_is_valid_for_90_days():
    certificate = issue_certificate("shop.example.com", date(2026, 3, 14))
    assert certificate.valid_from == date(2026, 3, 14)
    assert certificate.valid_until == date(2026, 6, 12)


def test_serial_depends_on_domain_and_date():
    first = issue_certificate("shop.example.com", date(2026, 3, 14))
    other_domain = issue_certificate("blog.example.com", date(2026, 3, 14))
    other_day = issue_certificate("shop.example.com", date(2026, 3, 15))
    assert len(first.serial) == 16
    assert first.serial != other_domain.serial
    assert first.serial != other_day.serial
