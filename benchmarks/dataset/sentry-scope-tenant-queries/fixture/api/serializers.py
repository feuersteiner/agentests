"""Turns model objects into JSON-ready dicts."""

from __future__ import annotations

from typing import Any

from core.models import Alert, Dashboard, Event, Project


def serialize_project(project: Project) -> dict[str, Any]:
    return {
        "id": project.id,
        "slug": project.slug,
        "name": project.name,
        "created_at": project.created_at.isoformat(),
    }


def serialize_dashboard(dashboard: Dashboard) -> dict[str, Any]:
    return {
        "id": dashboard.id,
        "project_id": dashboard.project_id,
        "title": dashboard.title,
    }


def serialize_alert(alert: Alert) -> dict[str, Any]:
    return {
        "id": alert.id,
        "project_id": alert.project_id,
        "name": alert.name,
        "threshold": alert.threshold,
        "is_muted": alert.is_muted,
    }


def serialize_event(event: Event) -> dict[str, Any]:
    return {
        "id": event.id,
        "project_id": event.project_id,
        "message": event.message,
        "timestamp": event.timestamp.isoformat(),
    }
