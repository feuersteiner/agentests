"""HTTP client for the Brindle Metrics API."""

import json
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request

from ingest import config


class ApiError(Exception):
    """The API answered a request with a status the client did not expect."""

    def __init__(self, status, path):
        super().__init__("request failed")
        self.status = status
        self.path = path


class ApiClient:
    def __init__(self, base_url=config.API_BASE_URL, token=None):
        self.base_url = base_url
        self.token = token

    def _open(self, method, path, params=None, body=None):
        url = self.base_url + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        data = None if body is None else json.dumps(body).encode()
        request = urllib.request.Request(url, data=data, method=method)
        request.add_header("Accept", "application/json")
        if data is not None:
            request.add_header("Content-Type", "application/json")
        if self.token:
            request.add_header("Authorization", f"Bearer {self.token}")
        return urllib.request.urlopen(request, timeout=config.REQUEST_TIMEOUT_S)

    def _send(self, method, path, params=None, body=None):
        try:
            with self._open(method, path, params, body) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.read()

    def request(self, method, path, params=None, body=None):
        """Send a request and return its status and body, whatever the status.

        A 503 is retried up to RETRY_ATTEMPTS_MAX attempts in all. When the last attempt still
        gets a 503, that status is returned, and callers such as get_json raise ApiError for it.
        """
        status, content = self._send(method, path, params, body)
        for attempt in range(1, config.RETRY_ATTEMPTS_MAX):
            if status != 503:
                break
            time.sleep(min(config.RETRY_BACKOFF_S * 2**attempt, config.RETRY_BACKOFF_S_MAX))
            status, content = self._send(method, path, params, body)
        return status, content

    def get_json(self, path, params=None):
        status, body = self.request("GET", path, params)
        if status != 200:
            raise ApiError(status, path)
        return json.loads(body)

    def list_events(self, cursor=None):
        """One page of /events: {"events": [...], "next": a cursor, or None on the last page}."""
        params = {"limit": config.PAGE_SIZE}
        if cursor:
            params["cursor"] = cursor
        return self.get_json("/events", params)

    def start_export(self, dataset):
        """Start an export job and return its id."""
        status, body = self.request("POST", "/exports", body={"dataset": dataset})
        if status != 202:
            raise ApiError(status, "/exports")
        return json.loads(body)["id"]

    def export_status(self, job_id):
        """{"status": "running"}, {"status": "failed"} or {"status": "done", "file": a path}."""
        return self.get_json(f"/exports/{job_id}")

    def download(self, path, destination):
        """Save the file the API serves at `path` to the local file `destination`."""
        with self._open("GET", path) as response, open(destination, "wb") as output:
            shutil.copyfileobj(response, output)
