---
name: ha-reuse-coordinator-for-polling
description: Use whenever you add or change code in HomeHub that reads a device or web API more than once over time, mainly integrations under homehub/integrations/. That covers a new sensor or integration that refreshes, a value that should update every N seconds or minutes or stay up to date, and an API with a request limit, even if the request says nothing about how to poll. Explains how to fetch on an interval with PollingCoordinator instead of hand-written loops, timers or background tasks.
---

# Periodic fetches go through the polling coordinator

## The rule

Anything that fetches data periodically goes through the project's existing polling coordinator; new code does not write its own polling loop, timer or background refresh task.

- Every periodic fetch goes through `homehub.coordinator.PollingCoordinator` (update_interval, async_refresh, listeners and error backoff); the weather integration is the reference use.

Apply this for the whole task: before every commit, check your diff against it.

## Why

`PollingCoordinator` already handles what a hand-written loop gets wrong or forgets: it backs off
when a device is unreachable instead of hammering it, keeps the last good data, tells entities
when new data arrives, marks them unavailable after a failed fetch, and stops when the hub stops.
A second polling mechanism has none of that until someone re-implements it, leaks a task or timer
on shutdown, and has to be tested and fixed separately.

## How to apply it

1. Read `homehub/coordinator.py` and `homehub/integrations/weather/__init__.py` before writing
   anything that refreshes.
2. In the integration's `async_setup`, build one `PollingCoordinator` per API: pass the client
   method (or a small async function that gathers several values) as `update_method` and the
   period as `update_interval`.
3. Call `await coordinator.async_refresh()` once. It fetches now and plans every later fetch.
4. Make each entity a `CoordinatorEntity` and compute `state` from `coordinator.data`.
5. Meet a rate limit by choosing `update_interval`, and share one coordinator between entities
   that read the same API, rather than adding sleeps or timestamps.

Signs you are breaking the rule: `while True` with `asyncio.sleep`, `loop.call_later` or
`call_at` that re-arms itself, `threading.Timer`, a scheduler job, `create_task` or
`ensure_future` for a refresh function, your own `try/except` with retry delays around a fetch,
or a new class that does what the coordinator does.

## Example

A doorbell integration that shows the battery of the doorbell, read every two minutes.

Violating: its own loop, task and error handling.

```python
class DoorbellBattery(Entity):
    async def _poll(self) -> None:
        while True:
            try:
                self._level = await self._client.get_battery()
                self.state_changed()
            except OSError:
                pass
            await asyncio.sleep(120)


async def async_setup(hub, config):
    sensor = DoorbellBattery("doorbell.battery", unit="%")
    hub.add_entity(sensor)
    asyncio.create_task(sensor._poll())
```

Compliant: the coordinator owns the schedule, the entity reads its data.

```python
class DoorbellBattery(CoordinatorEntity):
    @property
    def state(self):
        return self.coordinator.data


async def async_setup(hub, config):
    client = DoorbellClient(hub.http, config["base_url"])
    coordinator = PollingCoordinator(
        hub,
        name="doorbell",
        update_method=client.get_battery,
        update_interval=timedelta(minutes=2),
    )
    await coordinator.async_refresh()
    hub.add_entity(DoorbellBattery(coordinator, "doorbell.battery", unit="%"))
```

## Before you commit

Search your staged diff for `sleep`, `call_later`, `call_at`, `Timer`, `create_task`,
`ensure_future` and `while`. Anything there that repeats a fetch has to become a
`PollingCoordinator`. Fix it and check again.
