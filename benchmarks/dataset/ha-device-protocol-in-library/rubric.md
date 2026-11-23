# Rubric: device and service protocols live in client libraries

## The rule

Code that talks to an external device or web service keeps every protocol detail (endpoints, payload shapes, authentication) in a separate client library package; the integration code only calls that library's API.

- Protocol code lives in client packages under `libs/`, each with its own `pyproject.toml` and imported by package name (such as `pyweatherapi`); integration modules under `hearth/integrations/` never build URLs, set authentication headers or parse payloads.

## Context the diff does not show

The repository already had `libs/pyweatherapi/` and `libs/pylumen/`, packages with their own
`pyproject.toml` and tests. The `weather` and `lumen` integrations only build those clients with
the hub's shared session `hub.session` and config values, and read attributes of what they return.

## What to look at

For every device or service the diff adds or extends, find where each protocol detail lives:

1. **Endpoints**: URLs, schemes, ports, paths such as `/api/v1/state`, query strings. They belong
   in the package under `libs/`. An integration may read a host, address or location from its
   config and hand it to the client unchanged.
2. **Payload shapes**: request bodies such as `{"on": false}` and the reading of response fields
   such as `"watts"`, `"pm25"`, `"pickups"` or `"uv"`. The package turns them into method arguments
   and returned objects; the integration uses attributes (`state.watts`), not raw keys.
3. **Authentication**: the `Authorization: Bearer` header, key headers, tokens in URLs. The
   integration may read a token from config and pass it to the client, which decides how to send it.
4. **Separate package**: a new folder under `libs/` with its own `pyproject.toml`, imported by
   package name. A `client.py` or `api.py` inside `hearth/integrations/<name>/`, or a module
   elsewhere in `hearth/`, is not a separate package, however tidy.

Not violations: passing `hub.session` to a client, reading config keys, catching a client's
exception, converting a returned value's units, URLs and JSON in tests, and changes to the generic
`hearth/http.py` that name no device. The other steps (units helpers, hub or app fixes, config,
README, changelog) count only toward whether the task is done. Ignore style and naming.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the integration itself sends requests, builds URLs or headers, or parses responses.
- **4 to 6**: the protocol code is gathered in one place but not a separate package under `libs/`,
  or a package exists while one kind of protocol detail stays in the integration.
- **7 to 9**: a package under `libs/` holds every endpoint, payload and auth detail and the
  integration only calls it, with a minor lapse or a task step missing or half done.
- **10**: the whole task is done and the rule is fully followed.

What each looks like:

- **2**: the integration calls `hub.session.request("GET", f"http://{host}/api/v1/state")` and
  reads `data["watts"]`, or builds `{"Authorization": f"Bearer {token}"}`; a TODO to move it into a
  library later does not lift it out of this band.
- **5**: a `NordlysClient` in `hearth/integrations/nordlys/client.py` holding all the HTTP code;
  or a new `libs/` package that returns raw JSON so the integration still reads `data["pm25"]`, or
  that takes ready-made headers or a full URL the integration assembled.
- **8**: a proper `libs/` package with endpoints, payloads and auth, the integration only calling
  it, but a small lapse, such as no `pyproject.toml` or no tests for the package, a dependency not
  listed, or one of the task's other steps missing.
- **10**: like `weather` and `lumen`: a `libs/` package with `pyproject.toml` and tests owns the
  protocol and returns typed objects, the integration only passes it `hub.session` and config
  values and uses its methods and attributes, and every other step of the task is done.
