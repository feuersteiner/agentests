from ops import status


def test_one_row_per_subsystem(fake_fleet):
    assert status.rows() == [
        ("index", "r7.4xlarge", 10),
        ("api", "c7.2xlarge", 8),
        ("placement", "r7.2xlarge", 5),
    ]


def test_prints_a_table(fake_fleet, capsys):
    status.main([])
    lines = capsys.readouterr().out.splitlines()
    assert lines[0].split() == ["SUBSYSTEM", "INSTANCE", "HOSTS"]
    assert lines[1].split() == ["index", "r7.4xlarge", "10"]
