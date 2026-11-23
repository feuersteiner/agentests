# Report: ha-device-protocol-in-library

Status: done. Entry at `benchmarks/dataset/ha-device-protocol-in-library/` (87 files).

The prompt said an earlier worker had left a draft. None existed: there was no
`benchmarks/dataset/ha-device-protocol-in-library/`, no scratch folder for this rule, no report,
and nothing in `git status`. I built the whole entry from scratch.

## Final rule text

> Code that talks to an external device or web service keeps every protocol detail (endpoints, payload shapes, authentication) in a separate client library package; the integration code only calls that library's API.
>
> - Protocol code lives in client packages under `libs/`, each with its own `pyproject.toml` and imported by package name (such as `pyweatherapi`); integration modules under `hearth/integrations/` never build URLs, set authentication headers or parse payloads.

This is the research rule sentence unchanged, plus the triage's one policy fact with `homehub/` renamed to `hearth/` (see the deviation below). It appears word for word in `skill/SKILL.md`, `gate/TEST.md` and `rubric.md`, and it does not appear in `fixture/`. A check for the rule's sentences and for "protocol", "never build URLs" and "separate client library" found none of them in the fixture.

## Deviation from the research and triage: the app is `hearth/`, not `homehub/`

The research fixture and the triage's `how` name `homehub/integrations/`. The finished entry `ha-reuse-coordinator-for-polling` already ships a `homehub/integrations/` fixture whose integration folders hold `client.py` modules full of URL building and JSON parsing (`solar/client.py`, `spot_price/client.py`, `air_quality/client.py`). Under this rule those modules are violations. With the same glob, this Test would block any agent in that fixture that staged a `client.py` there (its task 2 renames the `station` key, which can touch `air_quality/client.py`), for content that was already there. In the other direction, that entry's Test would also judge this fixture's integrations. I therefore named the fictional app Hearth (`hearth/integrations/**/*.py`). Nothing else changed. No other fixture has a `hearth/` folder, and no other Test mentions it.

## The Test (`gate/test.yaml`)

`select.glob: 'hearth/integrations/**/*.py'`, with no select grep. Three assertions:

1. `no-endpoints`
   - grep: `://|/[A-Za-z0-9_{]|\?[A-Za-z_]+=|[Uu][Rr][Ll]|[Ee]ndpoint|:\d{2,5}\b|\b[Pp]ort\b`
   - decide: "This file is a module of an integration of Hearth, a home-automation hub, and the address of a device or web service API belongs in a separate client library package, never in this file. Passes when the code of this file writes or assembles no URL, no URL scheme such as http://, no endpoint path such as /api/v1/state, no query string such as ?address=, and no port number of an API, not even to hand it to another object. Reading a host name, IP address, street address or base URL from the integration's config and passing it unchanged to a client library is allowed."
2. `no-auth-details`
   - grep: `[Aa]uth|[Bb]earer|[Tt]oken|[Hh]eader|[Kk]ey|[Pp]assword|[Ss]ecret|[Cc]redential|[Ll]ogin|[Ss]ignature|[Hh]mac|HMAC|[Bb]asic`
   - decide: "This file is a module of an integration of Hearth, a home-automation hub, and how a device or web service authenticates belongs in a separate client library package, never in this file. Passes when the code of this file builds no authentication header such as Authorization or X-Api-Key, writes no scheme such as "Bearer " or "Basic " in front of a credential, puts no token or key into a URL, query or request body, signs no request, and requests, logs in for or refreshes no token itself. Reading a token, API key, user name or password from the integration's config and passing it as an argument to a client library's constructor or method is allowed."
3. `no-requests-or-payloads`
   - grep: `[Jj][Ss][Oo][Nn]|\.(get|post|put|patch|delete|request|send|fetch|read|recv|urlopen)\(|urllib|aiohttp|requests|httpx|socket|\[\s*["']|\{\s*["']`
   - decide: "This file is a module of an integration of Hearth, a home-automation hub, and the requests to a device or web service and the format of their data belong in a separate client library package, never in this file. Passes when the code of this file sends no request itself (through the hub's session, urllib, an HTTP client or a socket), encodes or decodes no request or response body, builds no request body out of the device's or service's own field names such as {"on": False}, and reads no field by its key out of data that came from a device or service, whether from a request or from a client library method, such as data["watts"] or status.get("pm25"). Calling methods of a client library and using attributes of the objects they return, such as state.watts, is allowed, and so is reading keys of the integration's own config, such as config["host"]."

`TEST.md` adds that every module under an integration's folder counts as integration code, `client.py` and `api.py` included. It also lists what an integration may do: read its config and hand values to a library, pass `hub.session`, and use the library's methods and returned attributes. A file that talks to no device or service passes.

## Evals (18)

| Eval                                     | Expect | What it is                                                                                                                                   | Assertions failed (both models) |
| ---------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| shipped-integrations                     | pass   | the fixture's 3 integration files unchanged                                                                                                  | none                            |
| nordlys-through-pynordlys                | pass   | task 1 done carefully (scratch copy): `libs/pynordlys` + integration                                                                         | none                            |
| nordlys-requests-in-integration          | fail   | task 1 done carelessly (scratch copy): `hub.session.request`, URL, `data["watts"]`, `{"on": False}`                                          | endpoints, requests             |
| aerona-through-pyaerona                  | pass   | task 2 careful: token from config passed to `pyaerona`                                                                                       | none                            |
| aerona-checks-its-config                 | pass   | task 2 careful, plus config validation and a log line mentioning the token                                                                   | none                            |
| aerona-bearer-requests-in-integration    | fail   | task 2 careless: Bearer header, `/api/status`, `data["fan"]["speed"]`                                                                        | all three                       |
| waste-through-pycitywaste                | pass   | task 3 careful: `pickups[0].date` from library objects                                                                                       | none                            |
| waste-query-built-in-integration         | fail   | task 3 careless: URL + `urlencode` + `pickups[0]["date"]`                                                                                    | endpoints, requests             |
| weather-uv-from-pyweatherapi             | pass   | task 4 careful: `uv_index` added to pyweatherapi, integration reads `current.uv_index`                                                       | none                            |
| weather-uv-fetched-in-integration        | fail   | task 4 careless: own GET to `/v2/current` with `X-Api-Key`, reads `"uv"`                                                                     | all three                       |
| weather-uv-read-from-raw-json            | fail   | library returns raw JSON, integration reads `data["uv"]` (only assertion 3)                                                                  | requests                        |
| nordlys-plug-returns-raw-json            | fail   | library returns raw dicts, integration reads keys and builds bodies (only assertion 3)                                                       | requests                        |
| base-url-assembled-in-integration        | fail   | integration builds `http://host:port/api/v1` and passes it to the library (only assertion 1)                                                 | endpoints                       |
| bearer-header-built-in-integration       | fail   | integration builds the `Authorization: Bearer` header and passes it to the library (only assertion 2)                                        | auth                            |
| client-module-in-integration-folder      | fail   | protocol in `hearth/integrations/nordlys/client.py`; its `__init__.py` is clean                                                              | endpoints, requests             |
| generic-client-with-paths-in-integration | fail   | thin generic `libs/` client; paths and JSON keys stay in the integration                                                                     | endpoints, requests             |
| away-mode-scene                          | pass   | selected file about something else: a scene switch with config reads, an attributes dict, `key=`, "On/off" (all three greps reach the model) | none                            |
| outside-the-integrations                 | skip   | `libs/pynordlys` protocol code, a changed `hearth/http.py`, a test with URLs, `docs/vendor-apis.md`, a NOTES.md under integrations           | n/a                             |

Each assertion has an eval that only it fails, and the proof logs confirm this on both models: `base-url-assembled-in-integration` fails `no-endpoints` only, `bearer-header-built-in-integration` fails `no-auth-details` only, and `nordlys-plug-returns-raw-json` and `weather-uv-read-from-raw-json` fail `no-requests-or-payloads` only.

## Tasks and tempting tags

All four research tasks are usable (the triage has no `usable_tasks`). Each researched prompt is word for word as step 2 of 4, and the prompts run 83 to 116 words.

- 1 `false`: it gives the plug's endpoints and payloads, which is the work itself, with no push toward a shortcut.
- 2 `false`: it only asks for support for the purifier and names the bearer token as a fact.
- 3 `false`: it asks for a sensor from a named API, with no wording toward inlining it.
- 4 `false`: it names the field and the endpoint as information; nothing asks for speed or a quick fix.

Other steps, all outside `hearth/integrations/`:

- task 1: the `format_power` kW bug with a test, tests for the plug, config, README and CHANGELOG.
- task 2: `Hub.async_refresh` aborts on the first failing entity (fix it and test it), a `format_concentration` helper, config, README and CHANGELOG.
- task 3: `setup` raises `ModuleNotFoundError` for an unknown integration (should be a `ValueError`, with a test), a `format_day` helper, config, README and CHANGELOG.
- task 4: rename `Hub.states()` to `snapshot()`, a check on `refresh_seconds` in `load_config` with tests, README and CHANGELOG.

## Fixture

Hearth, a fictional home-automation hub (Python 3.11 standard library and pytest, nothing installed), 26 files:

- the app: `hearth/` (hub, entity, `http.py` with the shared `HttpSession`, units with the kW bug, app), `hearth/integrations/` with `weather` (uses `pyweatherapi`) and `lumen` (uses `pylumen`).
- the libraries: `libs/pyweatherapi/` and `libs/pylumen/`, each with its own `pyproject.toml`, module and tests, that build the URLs, set the auth headers and return dataclasses.
- the tests: `tests/` (units, hub, app, and integrations that mock the libraries).
- the rest: a root `conftest.py` that puts every `libs/*` package on `sys.path`, `docs/vendor-apis.md` (Skycast, Lumen, Aerona and the city waste API), README, CHANGELOG, `pyproject.toml`, `config.example.json` and `.gitignore`.

15 tests pass as shipped, and no cache is left behind. `docs/vendor-apis.md` was added because tasks 2 and 3 give no endpoints or response shapes. The README describes `libs/` neutrally ("the client packages the integrations use"), and nothing in the fixture states the rule.

## Careless and careful, task 1 (scratch copies)

- Careless: `hearth/integrations/nordlys/__init__.py` calls `hub.session.request` on `http://{host}/api/v1/state`, reads `data["on"]` and `data["watts"]`, and posts `{"on": False}`. The other steps are done and pytest passes (18 tests). This breaks the rule. The same file is eval `nordlys-requests-in-integration`, which both models fail.
- Careful: `libs/pynordlys/` (with `pyproject.toml`, a `PlugState` dataclass and tests) plus an integration that only calls `get_state()` and `set_on()`, with the dependency added to `pyproject.toml` and the install line added to the README. pytest passes (20 tests). The same files are eval `nordlys-through-pynordlys`, which both models pass.
- No agent and no `agentests run` was used. The gate's verdict on these files comes from the proofs.

## Proving rounds: 2

- Round 1 (16 evals): luna 16/16, jev 16/16, 35 decision calls each, no refusal or error. Nothing changed in `test.yaml`.
- Between rounds I added two near-miss evals the set lacked: `aerona-checks-its-config` (pass), which tests whether `no-auth-details` false-positives on config validation, and `generic-client-with-paths-in-integration` (fail), a realistic half-fix. I changed, flipped and deleted nothing.
- Round 2 (final, frozen): luna 18/18, jev 18/18; 40 decision calls each; luna 0.0048 USD, jev 0.0022 USD; no refusal, no error, no mismatch.

| eval                                     | expected | luna | jev  |
| ---------------------------------------- | -------- | ---- | ---- |
| aerona-bearer-requests-in-integration    | fail     | fail | fail |
| aerona-checks-its-config                 | pass     | pass | pass |
| aerona-through-pyaerona                  | pass     | pass | pass |
| away-mode-scene                          | pass     | pass | pass |
| base-url-assembled-in-integration        | fail     | fail | fail |
| bearer-header-built-in-integration       | fail     | fail | fail |
| client-module-in-integration-folder      | fail     | fail | fail |
| generic-client-with-paths-in-integration | fail     | fail | fail |
| nordlys-plug-returns-raw-json            | fail     | fail | fail |
| nordlys-requests-in-integration          | fail     | fail | fail |
| nordlys-through-pynordlys                | pass     | pass | pass |
| outside-the-integrations                 | skip     | skip | skip |
| shipped-integrations                     | pass     | pass | pass |
| waste-query-built-in-integration         | fail     | fail | fail |
| waste-through-pycitywaste                | pass     | pass | pass |
| weather-uv-fetched-in-integration        | fail     | fail | fail |
| weather-uv-from-pyweatherapi             | pass     | pass | pass |
| weather-uv-read-from-raw-json            | fail     | fail | fail |

Both proof folders are deleted.

## Changed prompts or evals

No researched prompt was changed. No eval was changed, flipped or deleted; two evals were added before round 2.

## Research and triage notes

- The research `scope` is `cross-file`, and the triage's one-file restatement works: each integration file is judged on what it contains itself.
- The research fixture's `homehub/` became `hearth/`, for the overlap reason given above.
- Tasks 2 and 3 need API details the prompts do not give, so the fixture carries them in `docs/vendor-apis.md`.
- Gaps left to the judge, which the rubric covers:
  - protocol code put in a module elsewhere under `hearth/` (outside `integrations/`) is not selected;
  - a `libs/` package without its own `pyproject.toml` is not checked;
  - a docstring or comment that names an endpoint is not covered by an eval, and the criteria say "the code of this file".

## Not verified

- No agent run, so it is untested whether an untold agent really writes the inline HTTP code, and whether the skill's description gets it loaded among nine others.
- The Test was not run against other entries' fixtures; its glob matches no path in any of them.
- `claude plugin validate` was not run on the skill. Its frontmatter parses: the name is the rule id, the description has 450 characters, and it has no `$` placeholders.
- `pip install -e libs/...` (in the README's Running section) was not run offline. The tests do not need it.
