"""Settings, read from the environment."""

import os
from collections.abc import Mapping
from dataclasses import dataclass

DEFAULT_UPSTREAMS = ("192.0.2.53", "198.51.100.53", "203.0.113.53")


@dataclass(frozen=True)
class Settings:
    listen_host: str = "0.0.0.0"
    listen_port: int = 53
    upstreams: tuple[str, ...] = DEFAULT_UPSTREAMS
    query_timeout_s: float = 2.0
    rate_limit_qps: float = 50.0
    rate_limit_burst: int = 100
    query_log_path: str | None = None


def load_settings(env: Mapping[str, str] = os.environ) -> Settings:
    upstreams = tuple(
        entry.strip() for entry in env.get("RESOLVER_UPSTREAMS", "").split(",") if entry.strip()
    )
    return Settings(
        listen_host=env.get("RESOLVER_LISTEN_HOST", "0.0.0.0"),
        listen_port=env.get("RESOLVER_LISTEN_PORT", 53),
        upstreams=upstreams or DEFAULT_UPSTREAMS,
        query_timeout_s=float(env.get("RESOLVER_QUERY_TIMEOUT_S", 2.0)),
        rate_limit_qps=float(env.get("RESOLVER_RATE_LIMIT_QPS", 50.0)),
        rate_limit_burst=env.get("RESOLVER_RATE_LIMIT_BURST", 100),
        query_log_path=env.get("RESOLVER_QUERY_LOG") or None,
    )
