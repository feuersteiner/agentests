"""Times a batch upload against a local Depot: python3 scripts/bench_upload.py FILE..."""

import sys
import time

from uploader.client import UploadClient
from uploader.transport import HttpTransport

MAX_FILES = 20

start = time.time()
summary = UploadClient(HttpTransport("http://localhost:8080/v2", "dev")).upload_files(sys.argv[1:MAX_FILES + 1])
elapsed = time.time() - start
size = summary.uploaded_bytes
print(f"{size / elapsed / 1024**2:.1f} MiB/s over {elapsed:.1f} s")
