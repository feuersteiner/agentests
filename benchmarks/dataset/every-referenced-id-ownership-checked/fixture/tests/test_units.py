from __future__ import annotations

from manager.units import kg_to_lb, lb_to_kg, plates_per_side


def test_lb_to_kg():
    assert lb_to_kg(225) == 102.1


def test_kg_to_lb():
    assert kg_to_lb(100) == 220


def test_plates_per_side():
    assert plates_per_side(100) == [25, 15]


def test_plates_per_side_with_small_plates():
    assert plates_per_side(62.5) == [20, 1.25]
