from app.importer import import_catalogue
from app.metrics import IMPORT_ROWS

CSV = """sku,name,price
CARROT-1,Carrots 1kg,1.20
,No SKU,2.00
KALE-1,Kale,cheap
CARROT-1,Carrots again,1.30
BEET-1,Beetroot 500g,0.95
"""


def test_imports_good_rows_and_reports_the_rest():
    products = {}
    report = import_catalogue(CSV, products)
    assert sorted(products) == ["BEET-1", "CARROT-1"]
    assert products["BEET-1"].price_cents == 95
    assert report.imported == 2
    assert report.failed == 3
    assert report.errors == [
        "line 3: sku is empty",
        "line 4: price 'cheap' is not a number",
        "line 5: SKU CARROT-1 appears twice",
    ]


def test_counts_rows_by_outcome():
    import_catalogue(CSV, {})
    assert IMPORT_ROWS.labels(outcome="imported").value == 2
    assert IMPORT_ROWS.labels(outcome="failed").value == 3
