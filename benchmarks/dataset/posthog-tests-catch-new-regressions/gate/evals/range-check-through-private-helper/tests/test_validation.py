from decimal import Decimal

import pytest

from pricing import discounts


@pytest.mark.parametrize("pct", [-1, 101])
def test_take_pct_rejects_percentages_outside_0_to_100(pct):
    with pytest.raises(ValueError):
        discounts._take_pct(Decimal("100.00"), pct)
