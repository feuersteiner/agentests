import pytest

from uploader.client import UploadClient, UploadError
from uploader.config import Config

SMALL = Config(chunk_bytes=4)


def client_for(depot, clock, config=SMALL):
    return UploadClient(depot, config, clock=clock, sleep=clock.sleep)


def test_splits_a_file_into_chunks(depot, clock, make_file):
    result = client_for(depot, clock).upload_file(make_file("a.cr3", 10))

    assert [len(r["body"]) for r in depot.chunk_puts()] == [4, 4, 2]
    assert (result.file_bytes, result.chunks, result.retries) == (10, 3, 0)
    assert depot.requests[-1]["path"] == "/uploads/u1/complete"


def test_retries_a_chunk_after_a_503(depot, clock, make_file):
    depot.fail_chunk(0, 503)

    result = client_for(depot, clock).upload_file(make_file("a.cr3", 4))

    assert result.retries == 1
    assert len(depot.chunk_puts()) == 2


def test_backs_off_between_retries(depot, clock, make_file):
    depot.fail_chunk(0, 503, 503, 503, 503)

    client_for(depot, clock).upload_file(make_file("a.cr3", 4))

    assert clock.sleeps_s == [0.25, 0.5, 1.0, 2.0]


def test_gives_up_after_the_last_retry(depot, clock, make_file):
    depot.fail_chunk(0, 503, 503, 503, 503, 503)

    with pytest.raises(UploadError, match="HTTP 503"):
        client_for(depot, clock).upload_file(make_file("a.cr3", 4))
    assert len(depot.chunk_puts()) == 5


def test_summary_covers_every_file(depot, clock, make_file):
    depot.request_ms = 100
    paths = [make_file("a.cr3", 8), make_file("b.cr3", 3)]

    summary = client_for(depot, clock).upload_files(paths)

    assert [f.name for f in summary.files] == ["a.cr3", "b.cr3"]
    assert summary.uploaded_bytes == 11
    assert summary.duration_s == pytest.approx(0.7)
