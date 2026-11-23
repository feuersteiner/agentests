"""The Postgres database the worker records invoices in."""

from app import config


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
