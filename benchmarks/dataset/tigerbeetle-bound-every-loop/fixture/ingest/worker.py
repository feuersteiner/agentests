"""The worker: syncs events, stores uploads and starts exports."""

from ingest.models import Event


class Worker:
    def __init__(self, client, store):
        self.client = client
        self.store = store

    def sync_events(self):
        """Copy events from the API into the store. Returns how many were stored."""
        page = self.client.list_events()
        events = [Event.from_api(item) for item in page["events"]]
        self.store.add_events(events)
        return len(events)

    def process_upload(self, upload):
        """Store the non-blank lines of an upload. Returns how many were stored."""
        lines = [line for line in upload["body"].splitlines() if line.strip()]
        self.store.add_rows(upload["name"], lines)
        return len(lines)

    def export(self, dataset):
        """Start an export of `dataset` on the API. Returns the job's id."""
        return self.client.start_export(dataset)
