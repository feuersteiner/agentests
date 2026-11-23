from __future__ import annotations

from manager.models import Routine, SlotEntry, User, WorkoutLog


def test_exercises_are_listed(client, squat):
    response = client.get("/api/exercises/")
    assert response.status == 200
    assert response.data == [{"id": squat.id, "name": "Back squat", "category": "Legs"}]


def test_create_routine_belongs_to_caller(client, user):
    response = client.post("/api/routines/", {"name": "Hypertrophy B"})
    assert response.status == 201
    assert Routine.objects.get(id=response.data["id"]).user_id == user.id


def test_add_slot_entry(client, routine, squat):
    response = client.post(
        "/api/slot-entries/",
        {"routine": routine.id, "exercise": squat.id, "sets": 5, "reps": 5, "weight": 100.0},
    )
    assert response.status == 201
    assert SlotEntry.objects.get(id=response.data["id"]).routine_id == routine.id


def test_create_log(client, routine, session, squat):
    response = client.post(
        "/api/logs/",
        {"routine": routine.id, "session": session.id, "exercise": squat.id, "reps": 5, "weight": 100.0, "date": "2026-03-02"},
    )
    assert response.status == 201
    assert response.data["session"] == session.id
    assert WorkoutLog.objects.all().count() == 1


def test_create_log_needs_exercise(client, session):
    response = client.post("/api/logs/", {"session": session.id, "reps": 5, "weight": 100.0, "date": "2026-03-02"})
    assert response.status == 400
    assert "exercise" in response.data["detail"]


def test_update_log_reps(client, user, session, squat):
    log = WorkoutLog.objects.create(user_id=user.id, exercise_id=squat.id, reps=5, weight=100.0, date="2026-03-02", session_id=session.id)
    response = client.patch(f"/api/logs/{log.id}/", {"reps": 6})
    assert response.status == 200
    assert log.reps == 6


def test_logs_list_only_the_callers(client, user, squat):
    other = User.objects.create(username="grace")
    WorkoutLog.objects.create(user_id=user.id, exercise_id=squat.id, reps=5, weight=100.0, date="2026-03-02")
    WorkoutLog.objects.create(user_id=other.id, exercise_id=squat.id, reps=3, weight=140.0, date="2026-03-02")
    response = client.get("/api/logs/")
    assert [log["weight"] for log in response.data] == [100.0]


def test_templates_include_public_ones(client, user):
    other = User.objects.create(username="grace")
    own = Routine.objects.create(user_id=user.id, name="Mine", is_template=True)
    public = Routine.objects.create(user_id=other.id, name="5x5", is_template=True, is_public=True)
    Routine.objects.create(user_id=other.id, name="Private", is_template=True)
    response = client.get("/api/templates/")
    assert [template["id"] for template in response.data] == [own.id, public.id]


def test_session_detail(client, session):
    response = client.get(f"/api/sessions/{session.id}/")
    assert response.status == 200
    assert response.data["date"] == "2026-03-02"
