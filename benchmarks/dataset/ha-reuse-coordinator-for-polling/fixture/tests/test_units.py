from homehub.units import format_power, format_temperature


def test_temperature_has_one_decimal():
    assert format_temperature(21.46) == "21.5 °C"


def test_power_below_a_kilowatt_is_in_watts():
    assert format_power(640) == "640 W"
