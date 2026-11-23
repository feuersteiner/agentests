import asyncio

from helpers import FakeHttp

from homehub.entity import Entity
from homehub.hub import Hub


class Fixed(Entity):
    def __init__(self, name, value):
        super().__init__(name)
        self._value = value

    @property
    def state(self):
        return self._value


def test_states_are_keyed_by_entity_name():
    hub = Hub(FakeHttp({}))
    hub.add_entity(Fixed("door.front", "closed"))
    hub.add_entity(Fixed("door.back", "open"))

    assert hub.states() == {"door.front": "closed", "door.back": "open"}
    assert hub.get_entity("door.back").state == "open"


def test_stop_runs_the_callbacks_in_order():
    hub = Hub(FakeHttp({}))
    calls = []
    hub.on_stop(lambda: calls.append("first"))
    hub.on_stop(lambda: calls.append("second"))

    asyncio.run(hub.async_stop())

    assert calls == ["first", "second"]
