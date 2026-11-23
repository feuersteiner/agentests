"""Command line: python3 -m uploader.cli FILE..."""

import argparse
import os
import sys

from uploader.client import UploadClient
from uploader.config import Config
from uploader.report import render
from uploader.transport import HttpTransport


def main(argv=None, transport=None) -> int:
    parser = argparse.ArgumentParser(prog="uploader", description="Upload files to Depot.")
    parser.add_argument("paths", nargs="+", help="files to upload")
    args = parser.parse_args(argv)
    config = Config()
    if transport is None:
        transport = HttpTransport(config.base_url, os.environ["DEPOT_TOKEN"])
    summary = UploadClient(transport, config).upload_files(args.paths)
    print(render(summary))
    return 0


if __name__ == "__main__":
    sys.exit(main())
