---
name: capacity-removal-enforces-floor
description: Use whenever you write or change a script or admin command that removes capacity or deletes infrastructure, such as the commands under ops/ that drain or decommission hosts of a subsystem - new removal or clean-up scripts, new ways of choosing which hosts go, and changes to how many hosts go at once or how fast - even if the request says nothing about safety limits. Covers the minimum each pool must keep (min_hosts in config/pools.yaml) and how removals are batched and paced (max_batch, wait_healthy).
---

# Capacity removal enforces the floor

## The rule

A script or admin command that removes capacity or deletes infrastructure must refuse any request that would take a pool below its configured minimum, and must act in small, paced batches, instead of doing whatever count or pattern it is given.

- `config/pools.yaml` sets `min_hosts` and `max_batch` for every subsystem, and `ops/actions.py` provides `drain(host)`, `decommission(host)` and `wait_healthy(subsystem)`.
- Before it drains or decommissions any host, a command that removes hosts from a subsystem works out how many hosts the subsystem would have left once the whole request is done, whether the request names hosts or gives a count, a percentage or a name pattern. When that is fewer than the subsystem's `min_hosts`, it exits with an error and removes nothing. A confirmation prompt, a dry run or an option that skips the check is not a refusal.
- It removes hosts in batches of at most the subsystem's `max_batch`, one batch after another, and calls `wait_healthy(subsystem)` after each batch before the next one starts. One host at a time counts as batches of one, and the hosts of one batch may be handled in parallel.

## Why

In 2017 an engineer running a routine playbook mistyped one input to a capacity-removal command.
It removed far more servers than intended, including from two subsystems that then needed a full
restart, and Amazon S3 in us-east-1 was down for hours. The fix was in the tool: remove capacity
more slowly, and refuse any removal that would take a subsystem below its minimum. A typo, a
pattern that matches more than you thought, or a percentage of the wrong pool should hit a wall,
not the fleet. A confirmation prompt does not help: the person who typed the mistake confirms it.

## How to apply it

1. Resolve the request to the exact list of hosts it would remove, whatever form it came in.
2. Compare `len(current) - len(targets)` with the subsystem's `min_hosts`, once, up front. If it
   is lower, exit with an error that says why, before any `drain`. Do not trim the request to fit,
   and do not add a flag that skips the check.
3. Split the targets into batches of at most `max_batch`. Drain and decommission one batch, then
   `wait_healthy(subsystem)`, then start the next. Parallelism goes inside a batch, never across
   the whole list.

Slips to watch for: a thread pool over every target; a fixed batch size or a `--batch-size` option
not capped at `max_batch`; a floor check inside the loop or in each worker, which removes hosts
until it trips; a check on the old path but not the new option; one `wait_healthy` at the very end.

## Example

A command that retires every host older than a given hardware generation.

Violating: it does whatever the filter matches, all at once.

```python
targets = [h for h in inventory.hosts(subsystem) if generation(h) < args.before]
if input(f"Retire {len(targets)} hosts? [y/N] ") != "y":
    sys.exit(1)
with ThreadPoolExecutor() as ex:
    list(ex.map(lambda h: (drain(h), decommission(h)), targets))
```

Compliant: it refuses below the floor and removes in paced batches.

```python
settings = pool(subsystem)
current = inventory.hosts(subsystem)
targets = [h for h in current if generation(h) < args.before]
if len(current) - len(targets) < settings["min_hosts"]:
    sys.exit(f"refusing: {subsystem} would keep {len(current) - len(targets)} hosts,"
             f" its minimum is {settings['min_hosts']}")
size = settings["max_batch"]
for start in range(0, len(targets), size):
    batch = targets[start:start + size]
    with ThreadPoolExecutor(max_workers=len(batch)) as ex:
        list(ex.map(lambda h: (drain(h), decommission(h)), batch))
    wait_healthy(subsystem)
```

## Before you commit

For every staged file that drains or decommissions hosts, check each way it accepts a request:
the floor is checked against `min_hosts` for the whole request before the first `drain`, no batch
is larger than `max_batch`, and `wait_healthy` runs between batches. Fix what fails and check again.
