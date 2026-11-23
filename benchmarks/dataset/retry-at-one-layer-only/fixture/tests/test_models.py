from app.models import format_price


def test_format_price():
    assert format_price(1999) == "£19.99"
    assert format_price(1250) == "£12.50"
    assert format_price(349) == "£3.49"
