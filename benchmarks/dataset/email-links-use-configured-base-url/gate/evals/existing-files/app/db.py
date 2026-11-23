"""The app's data, kept in memory. Production swaps this module for the Postgres store."""

from __future__ import annotations

import secrets
import time
from dataclasses import dataclass, field


@dataclass
class User:
    id: int
    email: str
    name: str
    password_hash: str
    is_admin: bool = False


@dataclass
class Team:
    id: int
    title: str
    owner_id: int


@dataclass
class Membership:
    team_id: int
    user_id: int
    role: str  # "owner" or "member"


@dataclass
class Invitation:
    id: int
    team_id: int
    email: str
    invited_by: int
    created_at: float
    accepted_at: float | None = None


@dataclass
class Store:
    users: dict[int, User] = field(default_factory=dict)
    teams: dict[int, Team] = field(default_factory=dict)
    memberships: list[Membership] = field(default_factory=list)
    invitations: dict[int, Invitation] = field(default_factory=dict)
    sessions: dict[str, int] = field(default_factory=dict)
    _next_id: int = 1

    def reset(self) -> None:
        self.__init__()

    def _id(self) -> int:
        self._next_id += 1
        return self._next_id - 1

    def add_user(self, email: str, name: str, password_hash: str, is_admin: bool = False) -> User:
        user = User(self._id(), email.lower(), name, password_hash, is_admin)
        self.users[user.id] = user
        return user

    def find_user_by_email(self, email: str) -> User | None:
        email = email.lower()
        return next((u for u in self.users.values() if u.email == email), None)

    def start_session(self, user_id: int) -> str:
        session = secrets.token_urlsafe(24)
        self.sessions[session] = user_id
        return session

    def user_for_session(self, session: str) -> User | None:
        user_id = self.sessions.get(session)
        return self.users.get(user_id) if user_id is not None else None

    def end_sessions(self, user_id: int) -> None:
        self.sessions = {s: u for s, u in self.sessions.items() if u != user_id}

    def add_team(self, title: str, owner_id: int) -> Team:
        team = Team(self._id(), title, owner_id)
        self.teams[team.id] = team
        self.memberships.append(Membership(team.id, owner_id, "owner"))
        return team

    def membership(self, team_id: int, user_id: int) -> Membership | None:
        return next(
            (m for m in self.memberships if m.team_id == team_id and m.user_id == user_id), None
        )

    def members_of(self, team_id: int) -> list[Membership]:
        return [m for m in self.memberships if m.team_id == team_id]

    def add_member(self, team_id: int, user_id: int) -> Membership:
        membership = Membership(team_id, user_id, "member")
        self.memberships.append(membership)
        return membership

    def add_invitation(self, team_id: int, email: str, invited_by: int) -> Invitation:
        invitation = Invitation(self._id(), team_id, email.lower(), invited_by, time.time())
        self.invitations[invitation.id] = invitation
        return invitation

    def pending_invitations(self, team_id: int) -> list[Invitation]:
        return [
            i for i in self.invitations.values() if i.team_id == team_id and i.accepted_at is None
        ]


store = Store()
