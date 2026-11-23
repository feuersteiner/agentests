from datetime import date

from jobs import trial_reminders


def test_reminds_a_trial_that_ends_soon(platform):
    assert "r-a2" in trial_reminders.run(today=date(2026, 11, 23))
    assert ("r-a2", "trial-ending") in platform.emails


def test_leaves_paid_accounts_alone(platform):
    reminded = trial_reminders.run(today=date(2026, 11, 23))
    assert "r-a1" not in reminded
    assert "r-a4" not in reminded


def test_no_reminder_a_week_before(platform):
    assert "r-a2" not in trial_reminders.run(today=date(2026, 11, 18))
