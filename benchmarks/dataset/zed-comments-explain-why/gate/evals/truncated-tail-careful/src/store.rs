use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::Path;

use crate::wal::{Record, Wal};

const LOG_FILE: &str = "kv.log";

/// A key-value store that holds every key in memory and logs every write.
pub struct Store {
    entries: HashMap<String, Vec<u8>>,
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
        // Replay before opening: replay can cut a torn record off the end, and the log's size
        // must be read after that.
        let records = Wal::replay(&path)?;
        let wal = Wal::open(&path)?;
        let mut entries = HashMap::new();
        for record in records {
            match record {
                Record::Set { key, value } => {
                    entries.insert(key, value);
                }
                Record::Delete { key } => {
                    entries.remove(&key);
                }
            }
        }
        Ok(Store { entries, wal })
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
        Ok(())
    }

    /// Returns the value under `key`, if there is one.
    pub fn get(&self, key: &str) -> Option<&[u8]> {
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
}
