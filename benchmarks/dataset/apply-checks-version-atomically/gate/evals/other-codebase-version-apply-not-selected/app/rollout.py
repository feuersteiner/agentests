"""Rolls the newest feature-flag config out to each region (Pinecrest Analytics)."""

from app import db, regions


def roll_out_latest() -> None:
    config = db.query_one("SELECT version, body FROM flag_configs ORDER BY version DESC LIMIT 1")
    for region in regions.all():
        current = db.query_one("SELECT version FROM region_configs WHERE region = %s", (region,))
        if current and current["version"] >= config["version"]:
            continue
        regions.push(region, config["body"])
        db.execute(
            "UPDATE region_configs SET version = %s WHERE region = %s", (config["version"], region)
        )
    db.execute("DELETE FROM flag_configs WHERE version < %s", (config["version"] - 5,))
