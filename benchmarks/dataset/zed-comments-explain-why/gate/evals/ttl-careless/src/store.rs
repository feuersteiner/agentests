use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::Path;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::wal::{Record, Wal};

const LOG_FILE: &str = "kv.log";

/// A key-value store that holds every key in memory and logs every write.
pub struct Store {
    entries: HashMap<String, Vec<u8>>,
    expiries: HashMap<String, u64>,
    wal: Wal,
}

impl Store {
    /// Opens the store in `dir`, replaying its log.
    pub fn open(dir: impl AsRef<Path>) -> io::Result<Store> {
        let dir = dir.as_ref();
        if !dir.exists() {
            fs::create_dir(dir)?;
        }
        let path = dir.join(LOG_FILE);
        let wal = Wal::open(&path)?;
        let mut entries = HashMap::new();
        let mut expiries = HashMap::new();
        for record in Wal::replay(&path)? {
            match record {
                Record::Set { key, value } => {
                    expiries.remove(&key);
                    entries.insert(key, value);
                }
                Record::SetWithExpiry {
                    key,
                    value,
                    expires_at_ms,
                } => {
                    expiries.insert(key.clone(), expires_at_ms);
                    entries.insert(key, value);
                }
                Record::Delete { key } => {
                    expiries.remove(&key);
                    entries.remove(&key);
                }
            }
        }
        Ok(Store {
            entries,
            expiries,
            wal,
        })
    }

    /// Stores `value` under `key`, replacing any old value.
    pub fn set(&mut self, key: &str, value: &[u8]) -> io::Result<()> {
        // Log before the map: if the append fails, the map must not hold a value that a restart
        // would lose.
        self.wal.append(&Record::Set {
            key: key.to_string(),
            value: value.to_vec(),
        })?;
        self.entries.insert(key.to_string(), value.to_vec());
        // Remove any expiry for this key
        self.expiries.remove(key);
        Ok(())
    }

    /// Stores `value` under `key` until `ttl` has passed.
    pub fn set_with_ttl(&mut self, key: &str, value: &[u8], ttl: Duration) -> io::Result<()> {
        // Calculate when the key expires
        let expires_at_ms = now_ms().saturating_add(ttl.as_millis() as u64);
        // Write the record to the log
        self.wal.append(&Record::SetWithExpiry {
            key: key.to_string(),
            value: value.to_vec(),
            expires_at_ms,
        })?;
        // Store the value and its expiry
        self.entries.insert(key.to_string(), value.to_vec());
        self.expiries.insert(key.to_string(), expires_at_ms);
        Ok(())
    }

    /// Returns the value under `key`, if there is one and it has not expired.
    pub fn get(&self, key: &str) -> Option<&[u8]> {
        // Return None if the key has expired
        if self.is_expired(key) {
            return None;
        }
        self.entries.get(key).map(Vec::as_slice)
    }

    /// Deletes `key` and returns whether it was there.
    pub fn delete(&mut self, key: &str) -> io::Result<bool> {
        // No tombstone for a key that is not there: it would grow the log and slow every replay
        // for nothing.
        if !self.entries.contains_key(key) {
            return Ok(false);
        }
        self.wal.append(&Record::Delete {
            key: key.to_string(),
        })?;
        self.entries.remove(key);
        self.expiries.remove(key);
        Ok(true)
    }

    /// The number of keys.
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Whether the store holds no key.
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// The size of the log on disk, in bytes.
    pub fn log_bytes(&self) -> u64 {
        self.wal.bytes()
    }

    fn is_expired(&self, key: &str) -> bool {
        self.expiries
            .get(key)
            .is_some_and(|&expires_at_ms| expires_at_ms <= now_ms())
    }
}

/* Returns the current time in milliseconds since the Unix epoch. */
fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |since| since.as_millis() as u64)
}
