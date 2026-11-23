"""Records the worker stores."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Event:
    id: str
    kind: str
    at: str

    @classmethod
    def from_api(cls, item):
        return cls(id=item["id"], kind=item["kind"], at=item["at"])
