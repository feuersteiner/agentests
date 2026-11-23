from api.pagination import paginate


def test_first_page_points_at_the_next():
    page = paginate(list(range(5)), cursor=0, limit=2)

    assert page == {"results": [0, 1], "next": 2}


def test_last_page_has_no_next():
    page = paginate(list(range(5)), cursor=4, limit=2)

    assert page == {"results": [4], "next": None}


def test_cursor_past_the_end_gives_an_empty_page():
    page = paginate(list(range(3)), cursor=10, limit=2)

    assert page == {"results": [], "next": None}
