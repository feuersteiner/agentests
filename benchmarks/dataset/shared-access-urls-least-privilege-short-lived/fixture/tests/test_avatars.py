from app.web import Request, dispatch

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


def put_avatar(body: bytes, content_type: str, user_id: str = "u1"):
    return dispatch(Request("PUT", "/me/avatar", user_id=user_id, body=body,
                            headers={"content-type": content_type}))


def test_a_png_is_stored_and_served_back():
    assert put_avatar(PNG, "image/png").status == 204

    response = dispatch(Request("GET", "/users/u1/avatar", user_id="u2"))

    assert response.status == 200
    assert response.body == PNG
    assert response.headers["content-type"] == "image/png"


def test_other_image_types_are_refused():
    assert put_avatar(b"GIF89a", "image/gif").status == 415


def test_images_over_two_megabytes_are_refused():
    assert put_avatar(b"\x00" * (2 * 1024 * 1024 + 1), "image/jpeg").status == 413


def test_a_user_without_an_avatar_gets_not_found():
    assert dispatch(Request("GET", "/users/u9/avatar", user_id="u1")).status == 404
