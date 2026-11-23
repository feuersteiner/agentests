import time

from resolver.breaker import CircuitBreaker


def open_breaker() -> CircuitBreaker:
    breaker = CircuitBreaker()
    for _ in range(5):
        breaker.record_failure()
    return breaker


def test_opens_after_five_failures():
    assert not open_breaker().allow()


def test_retries_after_thirty_seconds(monkeypatch):
    breaker = open_breaker()
    started = time.time()
    monkeypatch.setattr(time, "time", lambda: started + 31)
    assert breaker.allow()
    elapsed = time.time() - started
    assert 1 / elapsed > 0
