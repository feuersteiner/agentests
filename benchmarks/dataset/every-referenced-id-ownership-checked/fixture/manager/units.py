"""Weight units and plate maths."""

from __future__ import annotations

KG_PER_LB = 0.45359237
PLATES_KG = (25, 20, 15, 10, 5, 2.5, 1.25)


def kg_to_lb(kg: float) -> float:
    return round(kg / KG_PER_LB)


def lb_to_kg(lb: float) -> float:
    return round(lb * KG_PER_LB, 1)


def plates_per_side(total_kg: float, bar_kg: float = 20) -> list[float]:
    """The plates to load on each side of the bar to reach `total_kg`, heaviest first."""
    remaining = (total_kg - bar_kg) / 2
    plates: list[float] = []
    for plate in PLATES_KG:
        while remaining >= plate:
            plates.append(plate)
            remaining -= plate
    return plates
