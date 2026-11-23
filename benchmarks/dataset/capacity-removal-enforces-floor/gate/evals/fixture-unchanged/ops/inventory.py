"""The subsystems of the fleet and the hosts that serve each, as the controller reports them."""

from ops import fleet


def subsystems() -> list[str]:
    """The names of the subsystems, in the controller's order."""
    return fleet.request("GET", "/subsystems")["subsystems"]


def hosts(subsystem: str) -> list[str]:
    """The hosts currently serving a subsystem."""
    return fleet.request("GET", f"/subsystems/{subsystem}/hosts")["hosts"]
