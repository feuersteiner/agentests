import pytest

from accounts.models import User
from core import db, mail


@pytest.fixture(autouse=True)
def clean_state():
    db.reset()
    mail.outbox.clear()
    yield
    db.reset()
    mail.outbox.clear()


@pytest.fixture
def ana() -> User:
    user = User.objects.create(username="ana", email="ana@example.com", display_name="Ana Silva")
    user.set_password("correct horse")
    return user
