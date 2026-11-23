import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from referrals import format_arr, group_by_partner, load, report, stage_counts

PARTNERS = [
    {"slug": "acme-advisory", "name": "Acme Advisory", "partner_manager": "Ellis Marsh"},
]
REFERRALS = [
    {
        "customer": "Birch Hotels",
        "partner": "acme-advisory",
        "registered": "2026-06-01",
        "stage": "accepted",
        "first_year_arr": None,
    },
    {
        "customer": "Alder Cafes",
        "partner": "acme-advisory",
        "registered": "2026-02-01",
        "stage": "closed-won",
        "first_year_arr": 12000,
    },
]


def test_format_arr():
    assert format_arr(76800) == "$76,800"
    assert format_arr(None) == "-"


def test_referrals_are_grouped_oldest_first():
    grouped = group_by_partner(REFERRALS)
    assert [item["customer"] for item in grouped["acme-advisory"]] == ["Alder Cafes", "Birch Hotels"]


def test_stage_counts():
    assert dict(stage_counts(REFERRALS)) == {"accepted": 1, "closed-won": 1}


def test_report_lists_each_referral():
    lines = report(PARTNERS, REFERRALS)
    assert lines[0] == "Acme Advisory (partner manager: Ellis Marsh)"
    assert any("Alder Cafes" in line and "$12,000" in line for line in lines)
    assert any("Birch Hotels" in line and "accepted" in line for line in lines)


def test_the_repository_data_loads():
    partners, referrals = load()
    slugs = {entry["slug"] for entry in partners}
    assert all(referral["partner"] in slugs for referral in referrals)
