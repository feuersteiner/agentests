"""Create a small demo database: python3 tools/seed_demo.py demo.db"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from billing import repo  # noqa: E402

DEMO_CUSTOMERS = [
    ("ada@example.com", "free", ["Garden plan"]),
    ("grace@example.com", "starter", ["Website", "Mobile app"]),
    ("linus@example.com", "business", ["Kernel", "Tooling", "Docs"]),
]


def seed(path: str) -> None:
    conn = repo.connect(path)
    now = datetime.now(timezone.utc)
    for email, plan, projects in DEMO_CUSTOMERS:
        customer_id = repo.add_customer(conn, email, plan, now, now + timedelta(days=14))
        repo.add_subscription(conn, customer_id, plan)
        for name in projects:
            repo.add_project(conn, customer_id, name)
    conn.close()


if __name__ == "__main__":
    seed(sys.argv[1])
