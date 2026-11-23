import asyncio

from hearth.hub import Hub
from hearth.integrations import nordlys


class FakeSession:
    def __init__(self, answer=None):
        self.answer = answer
        self.requests = []

    async def request(self, method, url, *, body=None, headers=None):
        self.requests.append((method, url, body))
        return self.answer


def test_plug_reads_state_and_power():
    session = FakeSession({"on": True, "watts": 12.5})
    hub = Hub(session=session)
    asyncio.run(nordlys.async_setup(hub, {"host": "192.168.1.40", "name": "plug"}))

    asyncio.run(hub.async_refresh())

    assert hub.states() == {"nordlys.plug": "on", "nordlys.plug_power": 12.5}
    assert session.requests[0] == ("GET", "http://192.168.1.40/api/v1/state", None)


def test_plug_switches_off():
    session = FakeSession()
    hub = Hub(session=session)
    asyncio.run(nordlys.async_setup(hub, {"host": "192.168.1.40"}))

    asyncio.run(hub.get("nordlys.plug").async_turn_off())

    assert session.requests == [("POST", "http://192.168.1.40/api/v1/state", {"on": False})]
    assert hub.get("nordlys.plug").state == "off"
