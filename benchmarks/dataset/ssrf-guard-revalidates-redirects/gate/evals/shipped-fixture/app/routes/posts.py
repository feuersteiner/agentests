"""Posts: short notes a member shares with the board, optionally with a link."""

from app import config, store
from app.web import App, Request, Response, error


def register(app: App) -> None:
    app.route("POST", "/posts")(create_post)
    app.route("GET", "/posts")(list_posts)
    app.route("GET", "/posts/<post_id>")(get_post)


def post_json(post: store.Post) -> dict:
    return {
        "id": post.id,
        "author": post.author,
        "text": post.text,
        "url": post.url,
        "created_at": post.created_at.isoformat(),
    }


def create_post(request: Request) -> Response:
    if request.member_id not in store.members:
        return error(401, "sign in to post")
    body = request.json or {}
    text = (body.get("text") or "").strip()
    url = body.get("url") or None
    if not text:
        return error(400, "text is required")
    if len(text) > config.MAX_POST_CHARS:
        return error(400, f"text is longer than {config.MAX_POST_CHARS} characters")
    if url is not None and not url.startswith(("http://", "https://")):
        return error(400, "url must start with http:// or https://")
    post = store.Post(
        id=store.next_id(), author=request.member_id, text=text, url=url, created_at=store.now()
    )
    store.posts[post.id] = post
    return Response(post_json(post), status=201)


def list_posts(request: Request) -> Response:
    posts = sorted(store.posts.values(), key=lambda post: post.id)
    return Response({"posts": [post_json(post) for post in posts]})


def get_post(request: Request, post_id: str) -> Response:
    post = store.posts.get(int(post_id)) if post_id.isdigit() else None
    if post is None:
        return error(404, "no such post")
    return Response(post_json(post))
