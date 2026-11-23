# Capacity removal enforces the floor

The commands under `ops/` that drain or decommission hosts of the Kestrel fleet's subsystems
follow this rule:

A script or admin command that removes capacity or deletes infrastructure must refuse any request that would take a pool below its configured minimum, and must act in small, paced batches, instead of doing whatever count or pattern it is given.

- `config/pools.yaml` sets `min_hosts` and `max_batch` for every subsystem, and `ops/actions.py` provides `drain(host)`, `decommission(host)` and `wait_healthy(subsystem)`.
- Before it drains or decommissions any host, a command that removes hosts from a subsystem works out how many hosts the subsystem would have left once the whole request is done, whether the request names hosts or gives a count, a percentage or a name pattern. When that is fewer than the subsystem's `min_hosts`, it exits with an error and removes nothing. A confirmation prompt, a dry run or an option that skips the check is not a refusal.
- It removes hosts in batches of at most the subsystem's `max_batch`, one batch after another, and calls `wait_healthy(subsystem)` after each batch before the next one starts. One host at a time counts as batches of one, and the hosts of one batch may be handled in parallel.

The single-host functions of `ops/actions.py` themselves are not removal commands. Files under
`ops/` that never call `drain` or `decommission`, such as the status command or the controller
client, are not judged, and neither are the tests under `tests/`.
