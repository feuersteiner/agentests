import logging

import pytest

from app import billing
from app.metrics import PAYMENT_FAILURES
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


def test_declined_charge_is_counted_per_customer(shop):
    shop.decline = billing.PaymentDeclined("card_declined", "Do not honour.")
    for _ in range(2):
        with pytest.raises(billing.PaymentDeclined):
            billing.charge(USERS[2], "tok_bad", 245)
    assert PAYMENT_FAILURES.labels(customer_id="2", code="card_declined").value == 2
