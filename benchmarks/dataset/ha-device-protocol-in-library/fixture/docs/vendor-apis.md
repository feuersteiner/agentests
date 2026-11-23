# Vendor API notes

What the vendors' documentation says about the devices and services in the flat, copied here so
we do not have to dig through their sites again.

## Skycast weather API

- Base URL `https://api.skycast.example`. Every request sends the account's key in the
  `X-Api-Key` header.
- `GET /v2/current?q=<place or lat,lon>` returns the conditions now:

  ```json
  { "temp_c": 4.5, "humidity": 81, "wind_ms": 3.2, "uv": 1.4, "observed": "2026-11-20T09:00Z" }
  ```

- An error comes back as `{ "error": { "code": 401, "message": "Invalid API key" } }`.

## Lumen light strip controller

- Local API at `http://<host>/api/light`, with the key from the Lumen app in the `X-Lumen-Key`
  header.
- `GET` returns `{ "power": "on", "bri": 180 }`, brightness from 0 to 255.
- `PUT` with `{ "power": "off" }` or `{ "bri": 90 }` changes it.

## Aerona air purifier

- Local API at `http://<host>/api`. Every request needs `Authorization: Bearer <token>`; the token
  is shown in the Aerona app under Settings, Local access.
- `GET /api/status` returns:

  ```json
  { "fan": { "speed": 2, "max": 4 }, "air": { "pm25": 8.4 }, "filter_pct": 71 }
  ```

  `speed` is 0 (off) to `max`, and `pm25` is in µg/m³.

- `PUT /api/fan` with `{ "speed": 3 }` sets the fan speed.

## City open data: waste collection

- `GET https://data.example-city.gov/api/waste?address=<street and number>`, no key needed.
- Returns the coming pickups for that address, soonest first:

  ```json
  {
    "address": "14 Brookside Road",
    "pickups": [
      { "date": "2026-11-24", "stream": "general" },
      { "date": "2026-11-27", "stream": "recycling" }
    ]
  }
  ```

- An unknown address returns HTTP 404.
