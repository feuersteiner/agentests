import pytest

from app import db
from app.models import Invoice, Job
from tests.fakes import FakeDriver


def test_connect_returns_a_database():
    driver = FakeDriver()
    database = db.connect("postgresql://test/invoicing", driver=driver)
    assert database.connection is driver.connections[0]
    assert driver.calls[0][0] == "postgresql://test/invoicing"


def test_connect_raises_when_postgres_refuses():
    with pytest.raises(db.DatabaseUnavailable):
        db.connect("postgresql://test/invoicing", driver=FakeDriver(refusals=1))


def test_save_invoice_inserts_and_commits(job_data):
    driver = FakeDriver()
    database = db.connect("postgresql://test/invoicing", driver=driver)
    database.save_invoice(Job.from_dict(job_data), Invoice("inv_1", "cus_ardent", 1999, "open"))
    connection = driver.connections[0]
    sql, params = connection.executed[0]
    assert sql.startswith("INSERT INTO invoices")
    assert params == ("job_1001", "inv_1", "cus_ardent", 1999, "open")
    assert connection.commits == 1
