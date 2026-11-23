import time
from datetime import datetime, timezone

import settings
from accounts.models import User
from accounts.tokens import check_token, make_token
from core import mail
from core.web import render


def test_get_and_filter(ana):
    assert User.objects.get(username="ana") is ana
    assert User.objects.filter(username="bea").first() is None


def test_iexact_and_in_lookups(ana):
    assert User.objects.filter(username__iexact="ANA").first() is ana
    assert User.objects.filter(id__in=[ana.id, 99]).count() == 1


def test_order_by_ascending():
    first = User.objects.create(username="first", email="first@example.com")
    second = User.objects.create(username="second", email="second@example.com")
    first.date_joined = datetime(2026, 1, 5, tzinfo=timezone.utc)
    second.date_joined = datetime(2026, 3, 9, tzinfo=timezone.utc)
    names = [user.username for user in User.objects.all().order_by("date_joined")]
    assert names == ["first", "second"]


def test_password_check(ana):
    assert ana.check_password("correct horse")
    assert not ana.check_password("Correct horse")


def test_send_mail_keeps_the_message():
    mail.send_mail(to="bea@example.com", subject="Hello", body="Hi Bea")
    assert [(message.to, message.subject) for message in mail.outbox] == [("bea@example.com", "Hello")]


def test_render_escapes_values_and_blanks_missing_ones():
    body = render("accounts/forgot_password.html", errors="<b>no</b>")
    assert "&lt;b&gt;no&lt;/b&gt;" in body
    assert "$message" not in body


def test_token_round_trip(ana):
    token = make_token(ana, "example")
    assert check_token(token, "example") is ana


def test_token_for_another_purpose_is_refused(ana):
    assert check_token(make_token(ana, "example"), "other") is None


def test_token_stops_working_after_a_password_change(ana):
    token = make_token(ana, "example")
    ana.set_password("new password")
    assert check_token(token, "example") is None


def test_expired_token_is_refused(ana, monkeypatch):
    token = make_token(ana, "example")
    later = time.time() + settings.TOKEN_MAX_AGE_SECONDS + 1
    monkeypatch.setattr(time, "time", lambda: later)
    assert check_token(token, "example") is None


def test_malformed_token_is_refused(ana):
    assert check_token("not-a-token", "example") is None
