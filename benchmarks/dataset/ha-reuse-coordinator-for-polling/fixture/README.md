# HomeHub

HomeHub is the small home-automation hub the Larkfield house team runs on a Raspberry Pi. It talks
to a handful of devices and web APIs and shows their readings as entities on the hallway display.

## Layout

- `homehub/hub.py`: the hub, which holds the entities and their states.
- `homehub/entity.py`: the entity base classes.
- `homehub/coordinator.py`: the `PollingCoordinator` class.
- `homehub/http.py`: the JSON-over-HTTP client the integrations share.
- `homehub/units.py`: helpers that format readings for the display.
- `homehub/app.py`: starts the hub and sets up the integrations named in the config.
- `homehub/integrations/`: one package per device or service.
- `tests/`: the pytest suite.

## Integrations

| Integration   | Entities                 | Config section |
| ------------- | ------------------------ | -------------- |
| `weather`     | `weather.temperature`    | `weather`      |
| `air_quality` | `air_quality.index`      | `air_quality`  |

`solar` and `spot_price` have an API client but no entities yet.

## Running

HomeHub needs Python 3.11 or later and nothing outside the standard library.

```sh
cp config.example.json config.json
python -m homehub.app config.json
```

## Tests

```sh
python -m pytest
```
