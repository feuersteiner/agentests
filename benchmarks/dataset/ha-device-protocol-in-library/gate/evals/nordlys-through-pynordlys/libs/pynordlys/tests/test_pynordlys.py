import asyncio

from pynordlys import NordlysPlug, PlugState


class FakeSession:
    def __init__(self, answer=None):
        self.answer = answer
        self.requests = []

    async def request(self, method, url, *, body=None, headers=None):
        self.requests.append((method, url, body))
        return self.answer


def test_get_state_reads_power_and_watts():
    session = FakeSession({"on": True, "watts": 12.5})
    plug = NordlysPlug(session, host="192.168.1.40")

    assert asyncio.run(plug.get_state()) == PlugState(on=True, watts=12.5)
    assert session.requests == [("GET", "http://192.168.1.40/api/v1/state", None)]


def test_set_on_posts_the_new_state():
    session = FakeSession()
    plug = NordlysPlug(session, host="192.168.1.40")

    asyncio.run(plug.set_on(False))

    assert session.requests == [("POST", "http://192.168.1.40/api/v1/state", {"on": False})]
