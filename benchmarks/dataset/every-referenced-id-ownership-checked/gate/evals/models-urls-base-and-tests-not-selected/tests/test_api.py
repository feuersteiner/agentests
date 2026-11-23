from __future__ import annotations

from manager.models import SlotEntry, WorkoutLog


def test_create_log_with_slot_entry(client, user, routine, session, squat):
    slot = SlotEntry.objects.create(user_id=user.id, routine_id=routine.id, exercise_id=squat.id, sets=5, reps=5)
    response = client.post(
        "/api/logs/",
        {"session": session.id, "slot_entry": slot.id, "exercise": squat.id, "reps": 5, "weight": 100.0, "date": "2026-03-02"},
    )
    assert response.status == 201
    assert WorkoutLog.objects.get(id=response.data["id"]).slot_entry_id == slot.id
