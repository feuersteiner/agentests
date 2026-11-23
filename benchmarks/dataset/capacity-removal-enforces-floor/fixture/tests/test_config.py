from ops.config import load_pools, pool


def test_reads_every_subsystem():
    assert sorted(load_pools()) == ["api", "index", "placement", "storage"]


def test_numbers_become_ints():
    assert pool("index")["min_hosts"] == 9
    assert pool("storage")["max_batch"] == 4


def test_text_stays_text():
    assert pool("api")["instance_type"] == "c7.2xlarge"


def test_ignores_comments_and_blank_lines(tmp_path):
    path = tmp_path / "pools.yaml"
    path.write_text("# header\n\ncache:  # the cache tier\n  instance_type: m7.large\n\n  min_hosts: 3\n")
    assert load_pools(path) == {"cache": {"instance_type": "m7.large", "min_hosts": 3}}
