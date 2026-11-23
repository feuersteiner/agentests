"""Puts every package under libs/ on the import path, as `pip install -e` would."""

import sys
from pathlib import Path

LIBS = Path(__file__).parent / "libs"

for package in sorted(LIBS.iterdir()):
    if (package / "pyproject.toml").is_file():
        sys.path.insert(0, str(package))
