"""Pinwheel's API: posts, member profiles and images for one community board."""

from app.routes import images, members, posts
from app.web import App


def create_app():
    app = App()
    posts.register(app)
    members.register(app)
    images.register(app)
    return app
