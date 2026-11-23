"""Pushing an endpoint's addresses to the DNS provider."""

import json
import re
import time
import urllib.request

ATTEMPTS = 3
BASE_DELAY_SECONDS = 0.5

_IPV4 = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")


class PushError(Exception):
    """The provider did not take an endpoint's addresses, after every attempt."""


class HttpDnsClient:
    """The provider's HTTP API: PUT {base_url}/records/{name} with the addresses as JSON."""

    def __init__(self, base_url: str, token: str, timeout_seconds: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout_seconds = timeout_seconds

    def put_records(self, name: str, addresses: list[str]) -> None:
        body = json.dumps({"ttl": 60, "values": addresses}).encode()
        request = urllib.request.Request(
            f"{self.base_url}/records/{name}",
            data=body,
            method="PUT",
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
            if response.status >= 300:
                raise ConnectionError(f"provider answered {response.status} for {name}")


_client = None


def configure(client) -> None:
    """Use `client` for every push. It needs one method, put_records(name, addresses)."""
    global _client
    _client = client


def fqdn(name: str) -> str:
    """The fully qualified form of an endpoint's name, with its trailing dot."""
    name = name.lower()
    return name if name.endswith(".") else name + "."


def validate_addresses(addresses: list[str]) -> list[str]:
    """The addresses, or ValueError when one of them is not an IP address."""
    for address in addresses:
        if not _IPV4.match(address) and ":" not in address:
            raise ValueError(f"not an IP address: {address!r}")
    return list(addresses)


def backoff_delays(attempts: int, base_seconds: float) -> list[float]:
    """The delays between attempts: base, twice base, four times base, and so on."""
    return [base_seconds * 2**index for index in range(attempts - 1)]


def push(endpoint: str, addresses: list[str]) -> None:
    """Send the addresses of `endpoint` to the provider.

    Tries ATTEMPTS times, sleeping between attempts, and raises PushError when every attempt
    fails. One attempt can take up to the client's timeout.
    """
    if _client is None:
        raise RuntimeError("call enactor.dns.configure() first")
    name = fqdn(endpoint)
    values = validate_addresses(addresses)
    delays = backoff_delays(ATTEMPTS, BASE_DELAY_SECONDS)
    for attempt in range(ATTEMPTS):
        try:
            _client.put_records(name, values)
            return
        except (ConnectionError, TimeoutError, OSError) as error:
            if attempt == ATTEMPTS - 1:
                raise PushError(f"{name}: {error}") from error
            time.sleep(delays[attempt])
