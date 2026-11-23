"""Teams, their members and invitations."""

from __future__ import annotations

import time

from app import config, tokens
from app.auth import login_required
from app.db import Team, User, store
from app.mail import send_mail
from app.web import BadRequest, Blueprint, Forbidden, NotFound, Request, Response, json, url_for

bp = Blueprint("teams")

INVITATION_MAX_AGE = 7 * 24 * 60 * 60  # seconds


def team_for_member(team_id: int, user: User) -> Team:
    team = store.teams.get(team_id)
    if team is None or store.membership(team_id, user.id) is None:
        raise NotFound("No such team.")
    return team


@bp.route("/teams", methods=["POST"])
def create_team(request: Request) -> Response:
    user = login_required(request)
    title = request.form.get("title", "").strip()
    if not title:
        raise BadRequest("A team needs a title.")
    team = store.add_team(title, user.id)
    return json({"id": team.id, "title": team.title}, status=201)


@bp.route("/teams/<int:team_id>/members", methods=["GET"])
def list_members(request: Request, team_id: int) -> Response:
    user = login_required(request)
    team = team_for_member(team_id, user)
    members = [
        {"id": m.user_id, "name": store.users[m.user_id].name, "role": m.role}
        for m in store.members_of(team.id)
    ]
    pending = [{"id": i.id, "email": i.email} for i in store.pending_invitations(team.id)]
    return json({"title": team.title, "members": members, "pending_invitations": pending})


@bp.route("/teams/<int:team_id>/invitations", methods=["POST"])
def invite(request: Request, team_id: int) -> Response:
    user = login_required(request)
    team = team_for_member(team_id, user)
    if team.owner_id != user.id:
        raise Forbidden("Only the team's owner can invite people.")
    email = request.form.get("email", "").strip()
    if not email:
        raise BadRequest("Whom should we invite? Give an email address.")
    invitation = store.add_invitation(team.id, email, user.id)
    token = tokens.make_token("team-invitation", invitation.id)
    link = config.PUBLIC_BASE_URL + url_for("teams.accept_invitation", token=token)
    send_mail(
        invitation.email,
        f"{user.name} invited you to {team.title} on Plover Rota",
        f"Hi,\n\n{user.name} has invited you to join the team {team.title} on Plover Rota.\n"
        f"Accept the invitation here. The link works for a week.\n\n{link}\n",
    )
    return json({"id": invitation.id, "email": invitation.email}, status=201)


@bp.route("/invitations/accept", methods=["POST"])
def accept_invitation(request: Request) -> Response:
    user = login_required(request)
    try:
        invitation_id = tokens.read_token(
            request.args.get("token", ""), "team-invitation", INVITATION_MAX_AGE
        )
    except tokens.InvalidToken:
        raise BadRequest("This invitation link is invalid or has expired.") from None
    invitation = store.invitations[invitation_id]
    if invitation.accepted_at is not None:
        raise BadRequest("This invitation has already been used.")
    if invitation.email != user.email:
        raise Forbidden("This invitation was sent to another email address.")
    if store.membership(invitation.team_id, user.id) is None:
        store.add_member(invitation.team_id, user.id)
    invitation.accepted_at = time.time()
    return json({"team_id": invitation.team_id})
