from app.net import is_public_address, is_public_url


def test_public_addresses():
    assert is_public_address("93.184.215.14")
    assert is_public_address("2606:2800:21f:cb07:6820:80da:af6b:8b2c")


def test_private_and_special_addresses():
    for address in [
        "10.0.0.7",
        "172.16.4.1",
        "192.168.1.20",
        "127.0.0.1",
        "::1",
        "169.254.169.254",
        "100.100.100.200",
        "fd00:ec2::254",
        "::ffff:10.0.0.7",
        "0.0.0.0",
        "not an address",
    ]:
        assert not is_public_address(address), address


def test_public_url(web):
    web.page("http://news.example/", "hi")
    assert is_public_url("http://news.example/")
    assert is_public_url("https://news.example/path?q=1")


def test_url_on_a_private_address(web):
    web.host("intranet.example", "10.0.0.7")
    assert not is_public_url("http://intranet.example/")


def test_url_with_another_scheme_or_no_host(web):
    web.page("http://news.example/", "hi")
    assert not is_public_url("ftp://news.example/")
    assert not is_public_url("file:///etc/passwd")
    assert not is_public_url("http:///nohost")
    assert not is_public_url("http://news.example:abc/")


def test_unknown_host(web):
    assert not is_public_url("http://nowhere.example/")
