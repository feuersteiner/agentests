import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import kpi_table  # noqa: E402

QUARTERS = [
    {"quarter": "Q3 FY2026", "customers": 3980, "arr": 238400000, "nrr": 106},
    {"quarter": "Q4 FY2026", "customers": 4090, "arr": 246900000, "nrr": 107},
]


def test_format_arr():
    assert kpi_table.format_arr(255000000) == "$255.0M"
    assert kpi_table.format_arr(238400000) == "$238.4M"


def test_format_row():
    assert kpi_table.format_row(QUARTERS[0]) == "| Q3 FY2026 | 3,980 | $238.4M | 106% |"


def test_table_has_header_and_rows():
    lines = kpi_table.table(QUARTERS).split("\n")
    assert lines[0] == "| Quarter | Customers | ARR | NRR |"
    assert lines[2:] == [
        "| Q3 FY2026 | 3,980 | $238.4M | 106% |",
        "| Q4 FY2026 | 4,090 | $246.9M | 107% |",
    ]


def test_repository_data_loads():
    quarters = kpi_table.load_quarters()
    assert quarters[0]["quarter"] == "Q1 FY2026"
    assert all({"quarter", "customers", "arr", "nrr"} <= set(q) for q in quarters)
