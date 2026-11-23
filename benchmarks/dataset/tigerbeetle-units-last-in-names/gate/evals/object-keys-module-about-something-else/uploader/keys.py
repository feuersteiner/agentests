"""The Depot object key for each local file."""

import re
import unicodedata
from pathlib import PurePath

# Depot keeps the raw files apart from the exported JPEGs, which live under "export/".
BASE_PREFIX = "raw/"
_UNSAFE = re.compile(r"[^a-z0-9._-]+")


def slug(text: str) -> str:
    """"Spring Lookbook" -> "spring-lookbook"."""
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return _UNSAFE.sub("-", ascii_text.strip().lower()).strip("-")


def object_key(shoot: str, path: str) -> str:
    """("Spring Lookbook", "card 2/IMG 0001.CR3") -> "raw/spring-lookbook/img-0001.cr3"."""
    name = PurePath(path).name
    return f"{BASE_PREFIX}{slug(shoot)}/{slug(name)}"
