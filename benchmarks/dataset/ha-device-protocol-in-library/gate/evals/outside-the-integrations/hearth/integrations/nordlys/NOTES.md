# Nordlys notes

The plug answers `GET http://<ip>/api/v1/state` with `{"on": true, "watts": 12.5}` and switches
on `POST /api/v1/state` with `{"on": false}`. Firmware 2.1 or later is needed for the watts field.
