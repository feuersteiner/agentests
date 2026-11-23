"""Settings for the queue jobs."""

from dataclasses import dataclass


@dataclass(frozen=True)
class JobSettings:
    max_retries: int
    retry_delay_seconds: int


DEFAULTS = JobSettings(max_retries=5, retry_delay_seconds=60)

# Jobs that need other settings than DEFAULTS. The stock sync waits longer between runs, so a
# hiccup of the inventory service is over before the job runs again.
OVERRIDES = {
    "stock-sync": JobSettings(max_retries=5, retry_delay_seconds=300),
}


def settings_for(name: str) -> JobSettings:
    return OVERRIDES.get(name, DEFAULTS)

# When each job runs, as a cron expression in UTC.
SCHEDULE = {
    "stock-sync": "30 3 * * *",
}
