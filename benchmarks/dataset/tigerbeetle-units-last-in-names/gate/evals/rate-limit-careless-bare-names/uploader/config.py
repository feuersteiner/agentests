"""Settings for talking to Depot."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    base_url: str = "https://depot.example.com/v2"
    # Depot refuses chunks over 16 MiB; 8 MiB keeps a retried chunk cheap on the studio uplink.
    chunk_bytes: int = 8 * 1024 * 1024
    request_timeout_s: float = 30.0
    retries_max: int = 4
    retry_delay_ms_max: int = 8_000
    # Rate limiting: at most 20 requests per second, bursts of up to 50.
    max_requests_per_second: float = 20.0
    max_burst: int = 50
