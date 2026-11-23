import re

import pytest

from app import giftcards, models


def test_issue_gift_card_creates_an_unused_card():
    code = giftcards.issue_gift_card(2000)
    assert re.fullmatch(r"KP-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}", code)
    card = models.get_gift_card(code)
    assert card.value_cents == 2000
    assert card.used_by is None
    assert card.used_at is None


def test_issue_gift_card_rejects_a_non_positive_value():
    with pytest.raises(ValueError):
        giftcards.issue_gift_card(0)
