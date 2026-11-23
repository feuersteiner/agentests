from hearth.units import format_brightness, format_power, format_temperature


def test_format_temperature_rounds_to_one_decimal():
    assert format_temperature(21.46) == "21.5 °C"


def test_format_power_below_a_kilowatt():
    assert format_power(230) == "230 W"


def test_format_brightness_as_percent():
    assert format_brightness(128) == "50 %"
    assert format_brightness(255) == "100 %"
