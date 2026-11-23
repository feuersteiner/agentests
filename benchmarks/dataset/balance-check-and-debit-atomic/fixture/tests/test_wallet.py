import pytest

from app import wallet
from app.errors import NotFound


def test_get_balance():
    assert wallet.get_balance(1) == 5000
    assert wallet.get_balance(2) == 0


def test_get_balance_of_unknown_user():
    with pytest.raises(NotFound):
        wallet.get_balance(99)


def test_add_credit_returns_the_new_balance():
    assert wallet.add_credit(2, 2500, "Top-up by card") == 2500
    assert wallet.get_balance(2) == 2500


def test_add_credit_records_an_entry():
    wallet.add_credit(1, 700, "Refund for misprint")
    history = wallet.credit_history(1)
    assert [(entry["amount_cents"], entry["reason"]) for entry in history] == [
        (700, "Refund for misprint")
    ]


def test_add_credit_rejects_a_non_positive_amount():
    with pytest.raises(ValueError):
        wallet.add_credit(1, 0, "Nothing")
    assert wallet.get_balance(1) == 5000
