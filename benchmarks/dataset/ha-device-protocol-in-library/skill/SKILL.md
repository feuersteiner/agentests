---
name: ha-device-protocol-in-library
description: Use whenever you add or change a Hearth integration under hearth/integrations/ that talks to a device or web service, such as a new device, sensor, switch or online service, or another value read from an API an integration already uses, including when you are given the API's URLs, JSON fields or token. Explains where endpoints, request and response formats and authentication go (a client package under libs/) and what integration code may contain.
---

# Device and service protocols live in client libraries

## The rule

Code that talks to an external device or web service keeps every protocol detail (endpoints, payload shapes, authentication) in a separate client library package; the integration code only calls that library's API.

- Protocol code lives in client packages under `libs/`, each with its own `pyproject.toml` and imported by package name (such as `pyweatherapi`); integration modules under `hearth/integrations/` never build URLs, set authentication headers or parse payloads.

Apply this for the whole task: before every commit, check your diff against it.

## Why

A client package can be tested on its own with a fake session, versioned, and reused by anything
else that talks to the same device. When a vendor changes a field or an endpoint, the fix is in one
package and the integration does not change. Integration code stays about the hub: which entities
exist, what their state is, what a switch does.

## How to apply it

1. Look at `libs/pyweatherapi/` and `hearth/integrations/weather/` first: that is the shape.
2. For a new device or service, create `libs/py<name>/` with its own `pyproject.toml`, a
   `py<name>/__init__.py` holding the client class, and `tests/` that use a fake session.
3. The client takes the session (`hub.session`) and plain values such as a host, address or
   token. It builds every URL, sends every request, sets every auth header, and turns each
   response into a dataclass or plain value.
4. The integration imports the client by package name, passes it `hub.session` and values from
   its config, calls its methods and reads attributes of what they return.
5. A new value from an API you already use means a new field or method in its package first, then
   the integration reads that attribute.

Signs you are breaking the rule, in any file under `hearth/integrations/`: `http://` or `https://`,
a path such as `/api/...`, `?key=`, `session.request(`, `urllib`, `json.loads`, `"Authorization"`,
`"Bearer "`, or a response read by key such as `data["level"]`. A `client.py` inside the
integration's folder breaks it too: it is not a separate package.

## Example

A Halden garage door: `GET http://<host>/door` returns `{"pos": "open"}`, with an `X-Key` header.

Violating: the integration speaks the protocol itself.

```python
class GarageDoor(SensorEntity):
    async def async_update(self) -> None:
        data = await self._session.request(
            "GET", f"http://{self._host}/door", headers={"X-Key": self._key}
        )
        self.native_value = data["pos"]
```

Compliant: `libs/pyhalden/` owns the protocol, and the integration calls it.

```python
# libs/pyhalden/pyhalden/__init__.py
class HaldenDoor:
    def __init__(self, session, host: str, key: str) -> None:
        self._session, self._url, self._headers = session, f"http://{host}/door", {"X-Key": key}

    async def get_position(self) -> str:
        data = await self._session.request("GET", self._url, headers=self._headers)
        return data["pos"]


# hearth/integrations/halden/__init__.py
from pyhalden import HaldenDoor

class GarageDoor(SensorEntity):
    async def async_update(self) -> None:
        self.native_value = await self._door.get_position()
```

## Before you commit

Read every staged file under `hearth/integrations/` and search it for the signs above. Move any
URL, request, header or response key into the package under `libs/`, then check again.
