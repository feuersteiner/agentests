"""The Postgres database the worker records invoices in."""

import logging
import random
import time

from app import config

logger = logging.getLogger("app.db")


class DatabaseUnavailable(Exception):
    """Postgres could not be reached or refused the connection."""


def _psycopg():
    import psycopg  # part of the production extra

    return psycopg


def connect(dsn=None, driver=None):
    """Open a connection to Postgres. Raises DatabaseUnavailable when it cannot be reached."""
    driver = driver or _psycopg()
    try:
        connection = driver.connect(
            dsn or config.DATABASE_URL, connect_timeout=config.DB_CONNECT_TIMEOUT_S
        )
    except driver.OperationalError as error:
        raise DatabaseUnavailable(str(error)) from error
    return Database(connection)


def connect_when_ready(dsn=None, driver=None, sleep=time.sleep):
    """Connect to Postgres, trying again while it is not ready yet.

    Gives up with DatabaseUnavailable after DB_CONNECT_MAX_ATTEMPTS attempts.
    """
    for attempt in range(config.DB_CONNECT_MAX_ATTEMPTS):
        try:
            return connect(dsn, driver)
        except DatabaseUnavailable as error:
            if attempt + 1 == config.DB_CONNECT_MAX_ATTEMPTS:
                raise
            delay_s = min(config.DB_RETRY_MAX_DELAY_S, config.DB_RETRY_BASE_DELAY_S * 2**attempt)
            logger.warning("Postgres not ready (%s), attempt %d", error, attempt + 1)
            sleep(random.uniform(0, delay_s))


class Database:
    def __init__(self, connection):
        self.connection = connection

    def save_invoice(self, job, invoice):
        """Record an invoice against its job. Saving the same job twice keeps the first row."""
        self.connection.execute(
            "INSERT INTO invoices (job_id, invoice_id, customer, amount_cents, status)"
            " VALUES (%s, %s, %s, %s, %s) ON CONFLICT (job_id) DO NOTHING",
            (job.id, invoice.id, invoice.customer, invoice.amount_cents, invoice.status),
        )
        self.connection.commit()

    def close(self):
        self.connection.close()
