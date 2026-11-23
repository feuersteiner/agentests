import asyncio

from hearth.entity import SensorEntity
from hearth.hub import Hub


class CountingSensor(SensorEntity):
    async def async_update(self) -> None:
        self.native_value = (self.native_value or 0) + 1


def test_refresh_updates_every_entity():
    hub = Hub(session=object())
    hub.add_entity(CountingSensor("test.one"))
    hub.add_entity(CountingSensor("test.two"))

    asyncio.run(hub.async_refresh())

    assert hub.states() == {"test.one": 1, "test.two": 1}


def test_unavailable_entity_has_no_state():
    hub = Hub(session=object())
    sensor = SensorEntity("test.sensor")
    sensor.native_value = 3
    sensor.available = False
    hub.add_entity(sensor)

    assert hub.states() == {"test.sensor": None}
