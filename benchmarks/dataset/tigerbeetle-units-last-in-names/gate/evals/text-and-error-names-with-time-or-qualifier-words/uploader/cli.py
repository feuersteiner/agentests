"""Command line: python3 -m uploader.cli FILE..."""

import argparse
import os
import sys

from uploader.client import UploadClient, UploadError
from uploader.config import Config
from uploader.report import render
from uploader.transport import HttpTransport


def main(argv=None, transport=None) -> int:
    parser = argparse.ArgumentParser(prog="uploader", description="Upload files to Depot.")
    parser.add_argument("paths", nargs="+", help="files to upload")
    parser.add_argument("--quiet", action="store_true", help="print only the first line of the summary")
    args = parser.parse_args(argv)
    config = Config()
    if transport is None:
        transport = HttpTransport(config.base_url, os.environ["DEPOT_TOKEN"])
    start_message = f"Uploading {len(args.paths)} file(s) to {config.base_url}"
    print(start_message, file=sys.stderr)
    last_error = None
    try:
        summary = UploadClient(transport, config).upload_files(args.paths)
    except UploadError as error:
        last_error = str(error)
    if last_error is not None:
        print(f"error: {last_error}", file=sys.stderr)
        return 1
    report = render(summary)
    total_line = report.splitlines()[0]
    print(total_line if args.quiet else report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
