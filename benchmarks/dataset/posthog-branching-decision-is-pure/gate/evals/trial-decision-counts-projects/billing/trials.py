"""Trial extensions."""

import sqlite3
from datetime import datetime, timedelta

from billing import repo
from billing.plans import FREE

MAX_SIGNUP_AGE = timedelta(days=30)
MAX_PROJECTS = 3


def trial_extension_allowed(conn: sqlite3.Connection, customer: repo.Customer, now: datetime) -> bool:
    """Whether a customer may get their trial extended."""
    if customer.plan != FREE.name:
        return False
    if now - customer.signed_up_at >= MAX_SIGNUP_AGE:
        return False
    if customer.trial_extended:
        return False
    return repo.count_projects(conn, customer.id) < MAX_PROJECTS
