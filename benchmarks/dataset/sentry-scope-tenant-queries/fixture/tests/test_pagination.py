from api.pagination import paginate


def test_first_page():
    page = paginate(["a", "b", "c", "d", "e"], page=1, per_page=2)

    assert page["results"] == ["a", "b"]
    assert page["pages"] == 3
    assert page["total"] == 5


def test_last_page_is_partly_filled():
    page = paginate(["a", "b", "c", "d", "e"], page=3, per_page=2)

    assert page["results"] == ["e"]


def test_page_past_the_end_is_empty():
    page = paginate(["a", "b", "c", "d", "e"], page=4, per_page=2)

    assert page["results"] == []
