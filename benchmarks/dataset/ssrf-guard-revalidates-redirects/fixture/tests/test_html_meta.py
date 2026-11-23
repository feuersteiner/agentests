from app.html_meta import page_meta, page_title


def test_title():
    assert page_title("<html><head><title> Allotment news </title></head></html>") == "Allotment news"


def test_og_title_comes_first():
    html = '<head><title>Home</title><meta property="og:title" content="Spring fair"></head>'
    assert page_title(html) == "Spring fair"


def test_no_title():
    assert page_title("<p>no head at all</p>") is None


def test_entities_are_decoded():
    assert page_title("<title>Beans &amp; peas</title>") == "Beans & peas"


def test_meta():
    html = '<meta property="og:image" content="https://x.example/a.png"><meta name="Description" content="Hi">'
    assert page_meta(html) == {"og:image": "https://x.example/a.png", "description": "Hi"}
