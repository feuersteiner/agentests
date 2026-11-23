"""Trellis's data model."""

from __future__ import annotations

from dataclasses import dataclass

from core.db import ForeignKey, Model, ReverseSet


@dataclass(eq=False)
class Project(Model):
    team_id: int
    slug: str
    name: str
    id: int = 0

    team = ForeignKey("Team")
    issue_set = ReverseSet("Issue", "project_id")

    def serialize(self) -> dict:
        return {"slug": self.slug, "openIssues": self.issue_set.filter(status="open").count()}
