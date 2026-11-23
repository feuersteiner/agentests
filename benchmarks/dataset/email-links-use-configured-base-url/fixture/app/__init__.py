"""Plover Rota's web app."""

from __future__ import annotations

from app.web import App


def create_app() -> App:
    from app import admin, auth, teams

    app = App()
    app.before_request(auth.load_user)
    for blueprint in (auth.bp, teams.bp, admin.bp):
        app.register(blueprint)
    return app
