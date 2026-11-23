"""The profile database. Production uses Postgres; this in-memory store stands in for it in tests."""

import copy


class ProfileStore:
    def __init__(
        self,
        profiles: dict[int, dict] | None = None,
        settings: dict[int, dict] | None = None,
    ) -> None:
        self._profiles = profiles or {}
        self._settings = settings or {}
        self.loads = 0

    async def load_profile(self, user_id: int) -> dict | None:
        self.loads += 1
        profile = self._profiles.get(user_id)
        return copy.deepcopy(profile) if profile is not None else None

    async def load_settings(self, user_id: int) -> dict | None:
        self.loads += 1
        settings = self._settings.get(user_id)
        return copy.deepcopy(settings) if settings is not None else None
