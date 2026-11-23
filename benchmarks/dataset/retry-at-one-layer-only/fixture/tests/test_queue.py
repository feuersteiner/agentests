import pytest

from app.queue import job, run_job


def test_run_job_runs_a_failing_job_again():
    runs = []

    @job("flaky")
    def flaky():
        runs.append(1)
        if len(runs) < 3:
            raise RuntimeError("not yet")
        return "done"

    assert run_job("flaky", sleep=lambda seconds: None) == "done"
    assert len(runs) == 3


def test_run_job_gives_up_after_max_retries():
    runs = []

    @job("broken")
    def broken():
        runs.append(1)
        raise RuntimeError("never")

    with pytest.raises(RuntimeError):
        run_job("broken", sleep=lambda seconds: None)
    assert len(runs) == 6
