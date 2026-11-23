"""The worker: syncs events, stores uploads and starts exports."""

import queue
import threading

from ingest.models import Event


class Worker:
    def __init__(self, client, store):
        self.client = client
        self.store = store
        self.uploads = queue.Queue()
        self._thread = None

    def start(self):
        """Start the background thread that processes queued uploads."""
        if self._thread is None:
            self._thread = threading.Thread(target=self._run, daemon=True)
            self._thread.start()

    def stop(self):
        """Stop the background thread after it has finished the queued uploads."""
        if self._thread is not None:
            self.uploads.put(None)
            self._thread.join()
            self._thread = None

    def enqueue_upload(self, upload):
        """Queue an upload for the background thread."""
        self.uploads.put(upload)

    def _run(self):
        while True:
            upload = self.uploads.get()
            if upload is None:
                break
            try:
                self.process_upload(upload)
            finally:
                self.uploads.task_done()

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
