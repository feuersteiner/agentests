"""The summary printed after a batch of uploads."""

from dataclasses import dataclass, field

_UNIT_BYTES = (("GiB", 1024**3), ("MiB", 1024**2), ("KiB", 1024))


@dataclass
class FileResult:
    name: str
    file_bytes: int
    chunks: int
    retries: int
    # Includes the waits between retries, so a flaky chunk shows up as a slow one.
    chunk_durations_ms: list[float] = field(default_factory=list)


@dataclass
class Summary:
    files: list[FileResult]
    duration_s: float

    @property
    def uploaded_bytes(self) -> int:
        return sum(result.file_bytes for result in self.files)

    @property
    def chunk_durations_ms(self) -> list[float]:
        return [duration_ms for result in self.files for duration_ms in result.chunk_durations_ms]

    @property
    def chunk_duration_ms_max(self) -> float:
        return max(self.chunk_durations_ms, default=0.0)

    @property
    def chunk_duration_ms_avg(self) -> float:
        durations_ms = self.chunk_durations_ms
        return sum(durations_ms) / len(durations_ms) if durations_ms else 0.0


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
    if summary.chunk_durations_ms:
        lines.append(
            f"Chunks took {summary.chunk_duration_ms_max:.0f} ms at most, "
            f"{summary.chunk_duration_ms_avg:.0f} ms on average"
        )
    for result in summary.files:
        lines.append(
            f"  {result.name}: {format_bytes(result.file_bytes)} in {result.chunks} chunk(s), "
            f"{result.retries} retries"
        )
    return "\n".join(lines)
