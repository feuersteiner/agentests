import pytest

from orders import emails, models
from store.db import transaction


def test_nothing_is_kept_when_the_block_raises(outside):
    with pytest.raises(RuntimeError):
        with transaction.atomic():
            models.create_order(1, 500)
            emails.send("mira@example.org", "Hello", "This goes out even though the order does not stay.")
            raise RuntimeError("boom")
    assert models.get_order(1) is None
    assert len(outside) == 1
