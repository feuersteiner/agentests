from tests.test_client import make_events


def test_sync_events_stores_the_events(api, worker, store):
    api.events = make_events(4)
    assert worker.sync_events() == 4
    assert store.count_events() == 4


def test_process_upload_stores_the_non_blank_lines(worker, store):
    stored = worker.process_upload({"name": "march.csv", "body": "a,1\n\nb,2\n"})
    assert stored == 2
    assert store.count_rows("march.csv") == 2


def test_export_starts_a_job(api, worker):
    assert worker.export("events") == "exp-1"
