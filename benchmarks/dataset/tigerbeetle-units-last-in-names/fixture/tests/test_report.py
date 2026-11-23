from uploader.report import FileResult, Summary, format_bytes, render


def test_format_bytes():
    assert format_bytes(512) == "512 B"
    assert format_bytes(1536) == "1.5 KiB"
    assert format_bytes(24 * 1024**2) == "24.0 MiB"
    assert format_bytes(5 * 1024**3) == "5.0 GiB"


def test_render():
    summary = Summary(
        files=[
            FileResult(name="a.cr3", file_bytes=24 * 1024**2, chunks=3, retries=0),
            FileResult(name="b.cr3", file_bytes=24 * 1024**2, chunks=3, retries=1),
        ],
        duration_s=6.3,
    )

    assert render(summary) == (
        "Uploaded 2 file(s), 48.0 MiB, in 6.3 s\n"
        "  a.cr3: 24.0 MiB in 3 chunk(s), 0 retries\n"
        "  b.cr3: 24.0 MiB in 3 chunk(s), 1 retries"
    )
