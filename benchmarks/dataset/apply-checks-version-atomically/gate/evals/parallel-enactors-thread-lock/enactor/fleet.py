"""Run three enactors side by side in one process."""

import threading

from enactor import loop

COUNT = 3


def run(interval_seconds: float) -> None:
    threads = [
        threading.Thread(target=loop.run_forever, args=(interval_seconds,), name=f"enactor-{index}")
        for index in range(1, COUNT + 1)
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
