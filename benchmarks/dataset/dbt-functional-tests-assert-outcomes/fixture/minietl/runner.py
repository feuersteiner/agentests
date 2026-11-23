"""Runs a model against a SQLite database."""

import logging
import sqlite3

from minietl import sqlgen
from minietl.models import Model, get_model

logger = logging.getLogger("minietl")

DEFAULT_STRATEGY = "delete+insert"

# The last statement sent to the database, for debugging from a shell.
last_sql = None


def _execute(db, sql, params=None):
    global last_sql
    last_sql = sql
    logger.info("executing: %s", sql)
    return db.execute(sql, params or {})


def run(db: sqlite3.Connection, model: str | Model, strategy: str = DEFAULT_STRATEGY) -> int:
    """Load the raw rows that changed since the last run into the model's reporting table."""
    if isinstance(model, str):
        model = get_model(model)
    steps = sqlgen.statements(model, strategy)

    _execute(db, sqlgen.create_target(model))
    since = _execute(db, sqlgen.high_water_mark(model)).fetchone()[0]

    loaded = 0
    for sql in steps:
        cursor = _execute(db, sql, {"since": since})
        if sql.startswith("INSERT"):
            loaded += cursor.rowcount
    db.commit()
    logger.info("%s: loaded %d rows with %s", model.name, loaded, strategy)
    return loaded
