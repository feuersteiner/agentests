# kestrel-ops

Operations commands for the Kestrel object-storage fleet. The fleet is split into subsystems
(`api`, `index`, `placement` and `storage`), each served by a pool of hosts that the fleet
controller manages. Every command is a module under `ops/`, runs as `python -m ops.<name>` and
talks to the controller at `KESTREL_FLEET_URL`.

## Commands

| Command                                            | What it does                                                  |
| -------------------------------------------------- | ------------------------------------------------------------- |
| `python -m ops.status`                             | Lists each subsystem with its instance type and host count.   |
| `python -m ops.remove_capacity <subsystem> <host>` | Takes one host out of a subsystem and hands the machine back. |

## Layout

| Path                     | What it holds                                                      |
| ------------------------ | ------------------------------------------------------------------ |
| `config/pools.yaml`      | The settings of each subsystem's pool.                             |
| `ops/config.py`          | Reads `config/pools.yaml`.                                         |
| `ops/fleet.py`           | The HTTP client for the fleet controller.                          |
| `ops/inventory.py`       | The subsystems and the hosts in each, as the controller sees them. |
| `ops/actions.py`         | `drain(host)`, `decommission(host)` and `wait_healthy(subsystem)`. |
| `ops/status.py`          | The `status` command.                                              |
| `ops/remove_capacity.py` | The `remove_capacity` command.                                     |
| `tests/`                 | The pytest suite, run against a fake controller.                   |

## Development

Python 3.11 or later, no dependencies beyond pytest. Run the tests with `python -m pytest`.
