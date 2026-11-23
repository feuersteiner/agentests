# Hearth

Hearth is the home-automation hub of the flat on Brookside Road. It runs on a Raspberry Pi in the
hallway cupboard, reads the devices and web services we use, and shows their readings as entities
on the kitchen tablet.

## Layout

- `hearth/hub.py`: the hub, which holds the entities, refreshes them and owns the HTTP session.
- `hearth/entity.py`: the entity base classes, for sensors and switches.
- `hearth/http.py`: `HttpSession`, the JSON-over-HTTP session the hub keeps as `hub.session`.
- `hearth/units.py`: helpers that format readings for the tablet.
- `hearth/app.py`: reads the config, sets up the integrations it names and refreshes them.
- `hearth/integrations/`: one package per device or service, each with an
  `async_setup(hub, config)` coroutine.
- `libs/`: the client packages the integrations use, each with its own `pyproject.toml` and tests.
- `docs/vendor-apis.md`: notes from the vendors' API documentation.
- `tests/`: the pytest suite of the hub and the integrations.

## Integrations

| Integration | Entities              | Config section |
| ----------- | --------------------- | -------------- |
| `weather`   | `weather.temperature` | `weather`      |
| `lumen`     | `lumen.<name>`        | `lumen`        |

## Running

Hearth needs Python 3.11 or later and nothing outside the standard library.

```sh
pip install -e libs/pyweatherapi -e libs/pylumen
cp config.example.json config.json
python -m hearth.app config.json
```

## Tests

```sh
python -m pytest
```

The root `conftest.py` puts every package under `libs/` on the import path, so the tests run
without installing anything.
