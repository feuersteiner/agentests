"""Git pre-push hook: refuse to push when the working tree has unformatted files."""

import os
import signal
import subprocess
import sys

DEFAULT_TIMEOUT_S = 60


def handle_sigint(signum, frame) -> None:
    print("pre-push: interrupted, nothing was pushed")
    sys.exit(130)


def handle_result(result: subprocess.CompletedProcess) -> int:
    if result.returncode != 0:
        print(result.stdout)
        print("pre-push: run the formatter before pushing")
    return result.returncode


def main() -> int:
    signal.signal(signal.SIGINT, handle_sigint)
    timeout = int(os.environ.get("PRE_PUSH_TIMEOUT_S", DEFAULT_TIMEOUT_S))
    formatter = os.environ.get("FORMATTER", "ruff")
    result = subprocess.run(
        [formatter, "format", "--check", "."], capture_output=True, text=True, timeout=timeout
    )
    return handle_result(result)


if __name__ == "__main__":
    sys.exit(main())
