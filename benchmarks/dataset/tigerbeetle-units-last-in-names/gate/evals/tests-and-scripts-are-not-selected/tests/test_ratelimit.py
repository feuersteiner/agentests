from uploader.ratelimit import RateLimiter

rate = 20
burst = 50
timeout = 5


def test_a_full_bucket_lets_a_burst_through(clock):
    limiter = RateLimiter(rate, burst, clock=clock, sleep=clock.sleep)
    start = clock()
    for _ in range(burst):
        limiter.acquire()
    elapsed = clock() - start
    assert elapsed == 0
    assert elapsed < timeout


def test_max_wait_after_the_burst(clock):
    limiter = RateLimiter(rate, burst, clock=clock, sleep=clock.sleep)
    for _ in range(burst + 1):
        limiter.acquire()
    max_wait = 1 / rate
    assert clock.sleeps_s == [max_wait]
