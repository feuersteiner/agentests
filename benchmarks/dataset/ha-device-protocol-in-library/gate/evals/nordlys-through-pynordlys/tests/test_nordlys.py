import asyncio

from pynordlys import PlugState

from hearth.hub import Hub
from hearth.integrations import nordlys


class FakePlug:
    def __init__(self, session, host):
        self.state = PlugState(on=True, watts=12.5)
        self.switched = []

    async def get_state(self):
        return self.state

    async def set_on(self, on):
        self.switched.append(on)


def test_plug_shows_state_and_power(monkeypatch):
    monkeypatch.setattr(nordlys, "NordlysPlug", FakePlug)
    hub = Hub(session=object())
    asyncio.run(nordlys.async_setup(hub, {"host": "192.168.1.40", "name": "plug"}))

    asyncio.run(hub.async_refresh())

    assert hub.states() == {"nordlys.plug": "on", "nordlys.plug_power": 12.5}


def test_plug_switches_off(monkeypatch):
    monkeypatch.setattr(nordlys, "NordlysPlug", FakePlug)
    hub = Hub(session=object())
    asyncio.run(nordlys.async_setup(hub, {"host": "192.168.1.40"}))
    switch = hub.get("nordlys.plug")

    asyncio.run(switch.async_turn_off())

    assert switch._plug.switched == [False]
    assert switch.state == "off"
