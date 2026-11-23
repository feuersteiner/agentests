from uploader.cli import main


def test_uploads_the_files_and_prints_the_summary(depot, make_file, capsys):
    path = make_file("a.cr3", 10)

    assert main([str(path)], transport=depot) == 0

    out = capsys.readouterr().out
    assert out.startswith("Uploaded 1 file(s), 10 B")
    assert "a.cr3: 10 B in 1 chunk(s), 0 retries" in out
