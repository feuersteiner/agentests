"""python -m enactor.fleet: start three enactors side by side and wait for them."""

import os
import subprocess
import sys

COUNT = 3


def main() -> None:
    processes = []
    for index in range(1, COUNT + 1):
        env = {**os.environ, "ENACTOR_NAME": f"enactor-{index}"}
        processes.append(subprocess.Popen([sys.executable, "-m", "enactor"], env=env))
    for process in processes:
        process.wait()


if __name__ == "__main__":
    main()
