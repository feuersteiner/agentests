from app.auth import hash_password
from app.db import store


def make_team(client, title="Night shift"):
    response = client.post("/teams", form={"title": title})
    assert response.status == 201
    return response.json()["id"]


def test_create_team(client, ada):
    client.log_in("ada@example.com", "correct horse")
    team_id = make_team(client)
    assert store.teams[team_id].title == "Night shift"
    assert store.membership(team_id, ada.id).role == "owner"


def test_create_team_needs_title(client, ada):
    client.log_in("ada@example.com", "correct horse")
    assert client.post("/teams", form={"title": " "}).status == 400


def test_list_members(client, ada):
    client.log_in("ada@example.com", "correct horse")
    team_id = make_team(client)
    bo = store.add_user("bo@example.com", "Bo", hash_password("pw"))
    store.add_member(team_id, bo.id)
    body = client.get(f"/teams/{team_id}/members").json()
    assert [m["name"] for m in body["members"]] == ["Ada", "Bo"]


def test_owner_invites_by_email(client, ada):
    client.log_in("ada@example.com", "correct horse")
    team_id = make_team(client)
    response = client.post(f"/teams/{team_id}/invitations", form={"email": "Kim@Example.com"})
    assert response.status == 201
    body = client.get(f"/teams/{team_id}/members").json()
    assert body["pending_invitations"] == [{"id": response.json()["id"], "email": "kim@example.com"}]


def test_only_owner_invites(client, ada):
    client.log_in("ada@example.com", "correct horse")
    team_id = make_team(client)
    store.add_user("bo@example.com", "Bo", hash_password("pw bo"))
    store.add_member(team_id, store.find_user_by_email("bo@example.com").id)
    client.log_in("bo@example.com", "pw bo")
    response = client.post(f"/teams/{team_id}/invitations", form={"email": "kim@example.com"})
    assert response.status == 403
