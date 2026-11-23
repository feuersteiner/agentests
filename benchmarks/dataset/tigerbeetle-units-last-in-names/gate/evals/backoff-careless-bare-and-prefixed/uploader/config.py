"""Settings for talking to Depot."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    base_url: str = "https://depot.example.com/v2"
    # Depot refuses chunks over 16 MiB; 8 MiB keeps a retried chunk cheap on the studio uplink.
    chunk_bytes: int = 8 * 1024 * 1024
    request_timeout_s: float = 30.0
    retries_max: int = 4
    # Retry backoff, in seconds: the first wait, how fast it grows, and the longest wait.
    initial_delay: float = 0.25
    backoff_multiplier: float = 2.0
    max_delay: float = 8.0
