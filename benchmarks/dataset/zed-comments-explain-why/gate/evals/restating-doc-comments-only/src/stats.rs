/// Counts that describe the store.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Stats {
    /// The number of keys.
    pub keys: usize,
    /// The size of the log, in bytes.
    pub log_bytes: u64,
}

impl Stats {
    /// Returns the average number of log bytes per key, or zero when there is no key.
    pub fn bytes_per_key(&self) -> u64 {
        if self.keys == 0 {
            0
        } else {
            self.log_bytes / self.keys as u64
        }
    }
}
