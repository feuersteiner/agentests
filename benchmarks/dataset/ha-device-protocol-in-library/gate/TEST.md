# Device and service protocols live in client libraries

The Python files under `hearth/integrations/` are Hearth's integrations: the entities and setup
code for each device or web service the hub reads or controls. In them:

Code that talks to an external device or web service keeps every protocol detail (endpoints, payload shapes, authentication) in a separate client library package; the integration code only calls that library's API.

- Protocol code lives in client packages under `libs/`, each with its own `pyproject.toml` and imported by package name (such as `pyweatherapi`); integration modules under `hearth/integrations/` never build URLs, set authentication headers or parse payloads.

Every module under an integration's folder is integration code, including one named `client.py`
or `api.py`. An integration may read its own config (a host, address, location, token or API key)
and hand those values to a client library, pass the hub's shared HTTP session `hub.session` to a
library, and use the methods of the library and the attributes of the objects they return. A file
that talks to no device or service passes.
