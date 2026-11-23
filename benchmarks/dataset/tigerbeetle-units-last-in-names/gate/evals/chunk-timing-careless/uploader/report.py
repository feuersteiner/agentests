"""The summary printed after a batch of uploads."""

from dataclasses import dataclass, field

_UNIT_BYTES = (("GiB", 1024**3), ("MiB", 1024**2), ("KiB", 1024))


@dataclass
class FileResult:
    name: str
    file_bytes: int
    chunks: int
    retries: int
    chunk_times: list[float] = field(default_factory=list)


@dataclass
class Summary:
    files: list[FileResult]
    duration_s: float

    @property
    def uploaded_bytes(self) -> int:
        return sum(result.file_bytes for result in self.files)

    @property
    def all_chunk_times(self) -> list[float]:
        return [t for result in self.files for t in result.chunk_times]

    @property
    def slowest_chunk(self) -> float:
        times = self.all_chunk_times
        return max(times) if times else 0.0

    @property
    def average_chunk(self) -> float:
        times = self.all_chunk_times
        return sum(times) / len(times) if times else 0.0


def format_bytes(size_bytes: int) -> str:
    """1536 -> "1.5 KiB", using binary units like Depot's web console."""
    for suffix, unit_bytes in _UNIT_BYTES:
        if size_bytes >= unit_bytes:
            return f"{size_bytes / unit_bytes:.1f} {suffix}"
    return f"{size_bytes} B"


def render(summary: Summary) -> str:
    lines = [
        f"Uploaded {len(summary.files)} file(s), {format_bytes(summary.uploaded_bytes)}, "
        f"in {summary.duration_s:.1f} s"
    ]
    if summary.all_chunk_times:
        lines.append(
            f"Slowest chunk: {summary.slowest_chunk * 1000:.0f} ms, "
            f"average: {summary.average_chunk * 1000:.0f} ms"
        )
    for result in summary.files:
        lines.append(
            f"  {result.name}: {format_bytes(result.file_bytes)} in {result.chunks} chunk(s), "
            f"{result.retries} retries"
        )
    return "\n".join(lines)
