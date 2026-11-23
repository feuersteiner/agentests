from scripts import delete_closed_sites


def test_deletes_the_listed_sites(platform, tmp_path, capsys):
    csv_path = tmp_path / "sites.csv"
    csv_path.write_text("id,account,closed_on\nr-53,Pemberton,2026-09-30\nr-54,Quayside,2026-10-04\n")
    delete_closed_sites.main([str(csv_path)])
    assert "r-53" not in platform.resources
    assert "r-54" not in platform.resources
    assert "r-b4" not in platform.resources
    assert "r-51" in platform.resources
    out = capsys.readouterr().out
    assert "deleted r-53 pemberton\n" in out
    assert out.endswith("2 sites moved to the trash\n")
