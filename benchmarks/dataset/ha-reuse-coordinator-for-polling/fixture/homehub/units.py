"""Helpers that format readings for the display."""

from __future__ import annotations


def format_temperature(celsius: float) -> str:
    """21.46 -> '21.5 °C'."""
    return f"{celsius:.1f} °C"


def format_power(watts: float) -> str:
    """Below 1000 W in watts, from 1000 W in kilowatts: 640 -> '640 W', 1500 -> '1.5 kW'."""
    if watts >= 1000:
        return f"{watts / 1000:.1f} W"
    return f"{watts:.0f} W"
