import asyncio

import pytest
from pylumen import LightState, LumenController


class FakeSession:
    def __init__(self, answer=None):
        self.answer = answer
        self.requests = []

    async def request(self, method, url, *, body=None, headers=None):
        self.requests.append((method, url, body, headers))
        return self.answer


def test_get_light_reads_power_and_brightness():
    session = FakeSession({"power": "on", "bri": 180})
    controller = LumenController(session, host="10.0.0.5", api_key="k")

    assert asyncio.run(controller.get_light()) == LightState(on=True, brightness=180)
    assert session.requests == [("GET", "http://10.0.0.5/api/light", None, {"X-Lumen-Key": "k"})]


def test_set_power_off():
    session = FakeSession()
    controller = LumenController(session, host="10.0.0.5", api_key="k")

    asyncio.run(controller.set_power(False))

    assert session.requests == [
        ("PUT", "http://10.0.0.5/api/light", {"power": "off"}, {"X-Lumen-Key": "k"})
    ]


def test_brightness_out_of_range_is_refused():
    controller = LumenController(FakeSession(), host="10.0.0.5", api_key="k")

    with pytest.raises(ValueError, match="got 300"):
        asyncio.run(controller.set_brightness(300))
