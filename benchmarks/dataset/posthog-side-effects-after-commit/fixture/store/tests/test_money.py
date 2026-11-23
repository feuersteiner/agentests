from store.money import format_cents


def test_formats_pounds_and_pence():
    assert format_cents(1250) == "£12.50"


def test_formats_less_than_a_pound():
    assert format_cents(75) == "£0.75"
