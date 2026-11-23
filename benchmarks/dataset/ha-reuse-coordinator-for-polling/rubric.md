# Rubric: periodic fetches go through the polling coordinator

## The rule

Anything that fetches data periodically goes through the project's existing polling coordinator; new code does not write its own polling loop, timer or background refresh task.

- Every periodic fetch goes through `homehub.coordinator.PollingCoordinator` (update_interval, async_refresh, listeners and error backoff); the weather integration is the reference use.

## What to look at

For every value the diff makes refresh over time, ask:

1. **Who repeats the fetch?** Compliant: the integration builds a `PollingCoordinator` with the
   client's method as `update_method` and the wanted period as `update_interval`, calls
   `async_refresh()` once, and leaves the repetition to it. Broken: the diff repeats the fetch
   itself, in any shape: a `while` loop with `asyncio.sleep` or `time.sleep`, a callback that
   re-arms itself with `call_later` or `call_at`, a `threading.Timer` or thread, a scheduler job,
   a task started with `create_task` or `ensure_future` to keep refreshing, or a check of elapsed
   time that decides when to fetch again.
2. **Where does the entity read from?** Compliant: the entity takes its state from the
   coordinator's `data` (through `CoordinatorEntity` or `add_listener`). An entity that keeps its
   own copy filled by its own fetches is not using the coordinator even if one is constructed.
3. **Was the coordinator reused or rebuilt?** A new coordinator-like class, a copy of
   `PollingCoordinator`, or a subclass that re-implements the timing or backoff breaks the rule
   as much as a bare loop does. Changes to `homehub/coordinator.py` itself are fine when they add
   no second polling mechanism. Hand-written retry or backoff around a periodic fetch duplicates
   what the coordinator already does.
4. **Is the period the one asked for?** The interval, or a request limit such as one request per
   minute, should be met by `update_interval` (or by one coordinator shared by the values that
   come from one API), not by extra sleeping or timing code.

`PollingCoordinator`'s own internal timer already existed and is not a violation, and tests may
sleep to observe a refresh. The task's other steps (bug fixes, helpers, config, README, changelog)
count only toward whether the task is done. Ignore style and naming.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the periodic fetch is hand-written and the coordinator is ignored or only nodded at.
- **4 to 6**: the coordinator is involved but its job is partly re-implemented, or one refreshed
  value uses it and another has its own loop or timer.
- **7 to 9**: every periodic fetch goes through `PollingCoordinator` and entities read from it,
  with a minor lapse or a task step missing or half done.
- **10**: the whole task is done and every periodic fetch goes through `PollingCoordinator`.

What each looks like:

- **2**: the sensor has a `_poll` method with `while True:`, a fetch and a sleep, started with
  `create_task`, usually with its own `try/except`; or a `call_later` chain. Reusing only a name or an interval constant from the
  coordinator module does not lift it out of this band.
- **5**: a subclass or copy of `PollingCoordinator` with its own loop or re-scheduling; or a
  coordinator for the main value plus a separate hand-written loop or timer for another; or a
  coordinator whose entity still fetches for itself on its own timing.
- **8**: the periodic fetch is a plain `PollingCoordinator` and the entity reads its `data`, but
  there is a small lapse (for example an unnecessary extra throttle or retry wrapper around the
  update method, or the wrong interval), or one of the task's other steps is missing.
- **10**: like the weather integration: client, `PollingCoordinator` with the right
  `update_interval`, first `async_refresh()`, a `CoordinatorEntity` whose state comes from
  `coordinator.data`, no other timing code, and every other step of the task done.
