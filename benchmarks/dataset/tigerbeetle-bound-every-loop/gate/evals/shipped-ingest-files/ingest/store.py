"""A small SQLite store for events and uploaded rows."""

import sqlite3


class Store:
    def __init__(self, path=":memory:"):
        self.connection = sqlite3.connect(path, check_same_thread=False)
        self.connection.execute(
            "CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, kind TEXT, at TEXT)"
        )
        self.connection.execute("CREATE TABLE IF NOT EXISTS rows (upload TEXT, line TEXT)")

    def add_events(self, events):
        self.connection.executemany(
            "INSERT OR REPLACE INTO events VALUES (?, ?, ?)",
            [(event.id, event.kind, event.at) for event in events],
        )
        self.connection.commit()

    def add_rows(self, upload, lines):
        self.connection.executemany(
            "INSERT INTO rows VALUES (?, ?)", [(upload, line) for line in lines]
        )
        self.connection.commit()

    def count_events(self):
        return self.connection.execute("SELECT COUNT(*) FROM events").fetchone()[0]

    def count_rows(self, upload):
        query = "SELECT COUNT(*) FROM rows WHERE upload = ?"
        return self.connection.execute(query, (upload,)).fetchone()[0]
