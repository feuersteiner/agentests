/// Formats a byte count for people, such as `1.5 KiB`.
pub fn human_bytes(bytes: u64) -> String {
    // Binary units, as `du -h` and `ls -lh` print them, so the numbers match what an operator
    // sees on the disk.
    const UNITS: [&str; 5] = ["B", "KiB", "MiB", "GiB", "TiB"];
    let mut value = bytes as f64;
    let mut unit = 0;
    while value >= 1024.0 && unit < UNITS.len() - 1 {
        value /= 1024.0;
        unit += 1;
    }
    if unit == 0 {
        format!("{bytes} B")
    } else {
        format!("{value:.1} {}", UNITS[unit])
    }
}
