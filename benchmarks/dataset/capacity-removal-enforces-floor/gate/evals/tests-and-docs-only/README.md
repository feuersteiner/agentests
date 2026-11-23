# kestrel-ops

| `python -m ops.decommission_matching <subsystem> <pattern>` | Decommissions the hosts whose names match. |

`ops/actions.py` provides `drain(host)`, `decommission(host)` and `wait_healthy(subsystem)`.
