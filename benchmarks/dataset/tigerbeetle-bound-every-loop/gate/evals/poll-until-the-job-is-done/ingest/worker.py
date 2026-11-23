"""The worker: syncs events, stores uploads and starts exports."""

import time

from ingest import config
from ingest.models import Event


class ExportFailed(Exception):
    """The API reported that an export job failed."""


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

    def export(self, dataset, destination):
        """Export `dataset` on the API and save the file to `destination`. Returns the job's id."""
        job_id = self.client.start_export(dataset)
        status = self.client.export_status(job_id)
        while status["status"] == "running":
            time.sleep(config.EXPORT_POLL_INTERVAL_S)
            status = self.client.export_status(job_id)
        if status["status"] != "done":
            raise ExportFailed(f"export {job_id} of {dataset} failed")
        self.client.download(status["file"], destination)
        return job_id
