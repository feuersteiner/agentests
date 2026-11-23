"""Prints the referral pipeline from data/partners.json and data/referrals.json.

    python3 scripts/referrals.py                                  # the whole pipeline
    python3 scripts/referrals.py --partner thornbury-consulting   # one partner's referrals

Prints one block per partner, with each referral's customer, registration date, stage and
first-year ARR, then the number of referrals at each stage.
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STAGES = ("registered", "accepted", "closed-won", "closed-lost")


def load(root=ROOT):
    """Return (partners, referrals) as read from the data folder."""
    data = Path(root) / "data"
    partners = json.loads((data / "partners.json").read_text(encoding="utf-8"))
    referrals = json.loads((data / "referrals.json").read_text(encoding="utf-8"))
    return partners, referrals


def select_partners(partners, partner=None):
    """Return the partners to report on: all of them, or the one whose slug is `partner`."""
    if partner is None:
        return list(partners)
    return [entry for entry in partners if entry["name"] == partner]


def group_by_partner(referrals):
    """Return {partner slug: [referral, ...]}, each list oldest registration first."""
    grouped = {}
    for referral in sorted(referrals, key=lambda item: item["registered"]):
        grouped.setdefault(referral["partner"], []).append(referral)
    return grouped


def stage_counts(referrals):
    """Return [(stage, count), ...] for every stage that has at least one referral."""
    counts = {}
    for referral in referrals:
        counts[referral["stage"]] = counts.get(referral["stage"], 0) + 1
    return sorted(counts.items())


def format_arr(value):
    """Return a first-year ARR for the report: `$76,800`, or `-` when it is not known."""
    return "-" if value is None else f"${value:,}"


def report(partners, referrals, partner=None):
    """Return the report's lines."""
    grouped = group_by_partner(referrals)
    chosen = select_partners(partners, partner)
    lines = []
    for entry in chosen:
        lines.append(f"{entry['name']} (partner manager: {entry['partner_manager']})")
        for referral in grouped[entry["slug"]]:
            lines.append(
                f"  {referral['customer']:<24} {referral['registered']}  "
                f"{referral['stage']:<12} {format_arr(referral['first_year_arr'])}"
            )
        lines.append("")
    shown = [referral for entry in chosen for referral in grouped.get(entry["slug"], [])]
    counts = ", ".join(f"{stage} {count}" for stage, count in stage_counts(shown))
    lines.append(f"Stages: {counts}")
    return lines


def main(argv=None):
    parser = argparse.ArgumentParser(description="Prints the referral pipeline.")
    parser.add_argument("--partner", help="one partner's slug, such as thornbury-consulting")
    args = parser.parse_args(argv)
    partners, referrals = load()
    for line in report(partners, referrals, args.partner):
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
