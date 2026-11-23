from ingest.util import format_bytes


def test_format_bytes():
    assert format_bytes(512) == "512 B"
    assert format_bytes(1536) == "1.5 KiB"
    assert format_bytes(2 * 1024 * 1024 + 1) == "2.0 MiB"
