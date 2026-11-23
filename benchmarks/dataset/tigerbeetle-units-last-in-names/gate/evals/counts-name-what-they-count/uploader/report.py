"""The summary printed after a batch of uploads."""

from dataclasses import dataclass

_UNIT_BYTES = (("GiB", 1024**3), ("MiB", 1024**2), ("KiB", 1024))


@dataclass
class FileResult:
    name: str
    file_bytes: int
    chunks: int
    retries: int


@dataclass
class Summary:
    files: list[FileResult]
    duration_s: float

    @property
    def uploaded_bytes(self) -> int:
        return sum(result.file_bytes for result in self.files)


def format_bytes(size_bytes: int) -> str:
    """1536 -> "1.5 KiB", using binary units like Depot's web console."""
    for suffix, unit_bytes in _UNIT_BYTES:
        if size_bytes >= unit_bytes:
            return f"{size_bytes / unit_bytes:.1f} {suffix}"
    return f"{size_bytes} B"


def render(summary: Summary) -> str:
    file_count = len(summary.files)
    retry_count = sum(result.retries for result in summary.files)
    lines = [
        f"Uploaded {file_count} file(s), {format_bytes(summary.uploaded_bytes)}, "
        f"in {summary.duration_s:.1f} s, with {retry_count} retries"
    ]
    for result in summary.files:
        lines.append(
            f"  {result.name}: {format_bytes(result.file_bytes)} in {result.chunks} chunk(s), "
            f"{result.retries} retries"
        )
    return "\n".join(lines)
