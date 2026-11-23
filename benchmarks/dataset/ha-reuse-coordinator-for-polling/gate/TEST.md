# Periodic fetches go through the polling coordinator

The Python files under `homehub/integrations/` are HomeHub's integrations: their clients, their
entities and their setup. In them:

Anything that fetches data periodically goes through the project's existing polling coordinator; new code does not write its own polling loop, timer or background refresh task.

- Every periodic fetch goes through `homehub.coordinator.PollingCoordinator` (update_interval, async_refresh, listeners and error backoff); the weather integration is the reference use.

A file that fetches once, or that only defines a client, fetches nothing periodically. Passing an
interval to `PollingCoordinator` is the coordinator's polling, not the file's own.
