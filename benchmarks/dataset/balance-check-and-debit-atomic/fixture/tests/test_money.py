from app.money import format_cents, parse_amount


def test_format_cents():
    assert format_cents(1205) == "£12.05"
    assert format_cents(99) == "£0.99"
    assert format_cents(0) == "£0.00"


def test_parse_amount():
    assert parse_amount("12.05") == 1205
    assert parse_amount("12") == 1200
    assert parse_amount(" 7.40 ") == 740
