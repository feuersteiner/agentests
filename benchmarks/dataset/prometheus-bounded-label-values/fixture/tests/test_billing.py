import logging

import pytest

from app import billing
from app.models import USERS


def test_charge_returns_the_payment(shop):
    payment = billing.charge(USERS[1], "tok_visa", 1850)
    assert payment == billing.Payment("pay_1", 1, 1850)
    assert shop.charges == [("tok_visa", 1850)]


def test_declined_charge_is_logged_and_raised(shop, caplog):
    shop.decline = billing.PaymentDeclined("insufficient_funds", "Your card has insufficient funds.")
    with caplog.at_level(logging.WARNING), pytest.raises(billing.PaymentDeclined):
        billing.charge(USERS[2], "tok_low", 245)
    assert "insufficient_funds" in caplog.text
