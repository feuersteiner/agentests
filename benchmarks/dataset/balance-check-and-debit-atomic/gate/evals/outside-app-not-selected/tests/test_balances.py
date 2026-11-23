from app import db, wallet


def test_balance_can_be_set_directly_for_a_scenario():
    balance = wallet.get_balance(1)
    if balance >= 1000:
        db.connection().execute(
            "UPDATE users SET credit_cents = ? WHERE id = 1", (balance - 1000,)
        )
    assert wallet.get_balance(1) == 4000
