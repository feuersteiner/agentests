from app.web import Request, dispatch


def test_requests_without_a_user_are_refused():
    assert dispatch(Request("GET", "/exports")).status == 401


def test_unknown_paths_are_not_found():
    assert dispatch(Request("GET", "/nope", user_id="u1")).status == 404


def test_path_parameters_reach_the_handler():
    response = dispatch(Request("GET", "/users/u_7/avatar", user_id="u1"))
    assert response.json == {"error": "no avatar"}
