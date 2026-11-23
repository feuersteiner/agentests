"""Helpers that format readings for the tablet."""

from __future__ import annotations


def format_temperature(celsius: float) -> str:
    """Format a temperature with one decimal: 21.46 becomes "21.5 °C"."""
    return f"{celsius:.1f} °C"


def format_power(watts: float) -> str:
    """Format a power reading: whole watts below 1 kW, kilowatts with one decimal from 1 kW up."""
    if watts >= 1000:
        return f"{watts / 1000:.1f} W"
    return f"{watts:.0f} W"


def format_brightness(level: int) -> str:
    """Format a brightness from 0 to 255 as a percentage: 128 becomes "50 %"."""
    return f"{round(level * 100 / 255)} %"
