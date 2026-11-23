use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::Path;

const OP_SET: u8 = 1;
const OP_DELETE: u8 = 2;
const HEADER_BYTES: usize = 9;

/// One logged write.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Record {
    Set { key: String, value: Vec<u8> },
    Delete { key: String },
}

impl Record {
    fn encode(&self) -> Vec<u8> {
        let (op, key, value): (u8, &str, &[u8]) = match self {
            Record::Set { key, value } => (OP_SET, key, value),
            Record::Delete { key } => (OP_DELETE, key, &[]),
        };
        let mut bytes = Vec::with_capacity(HEADER_BYTES + key.len() + value.len());
        bytes.push(op);
        // Little-endian on every platform, so a log written on one machine replays on another.
        bytes.extend_from_slice(&(key.len() as u32).to_le_bytes());
        bytes.extend_from_slice(&(value.len() as u32).to_le_bytes());
        bytes.extend_from_slice(key.as_bytes());
        bytes.extend_from_slice(value);
        bytes
    }

    /// Decodes the record at the start of `bytes` and returns it with its encoded length.
    fn decode(bytes: &[u8]) -> io::Result<(Record, usize)> {
        if bytes.len() < HEADER_BYTES {
            return Err(truncated());
        }
        let key_len = u32::from_le_bytes([bytes[1], bytes[2], bytes[3], bytes[4]]) as usize;
        let value_len = u32::from_le_bytes([bytes[5], bytes[6], bytes[7], bytes[8]]) as usize;
        let len = HEADER_BYTES + key_len + value_len;
        if bytes.len() < len {
            return Err(truncated());
        }
        let key = String::from_utf8(bytes[HEADER_BYTES..HEADER_BYTES + key_len].to_vec())
            .map_err(|_| invalid("key is not UTF-8"))?;
        let record = match bytes[0] {
            OP_SET => Record::Set {
                key,
                value: bytes[HEADER_BYTES + key_len..len].to_vec(),
            },
            OP_DELETE => Record::Delete { key },
            _ => return Err(invalid("unknown operation")),
        };
        Ok((record, len))
    }
}

fn truncated() -> io::Error {
    io::Error::new(io::ErrorKind::UnexpectedEof, "log record is truncated")
}

fn invalid(message: &str) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, format!("log record is invalid: {message}"))
}

/// An append-only log of the store's writes.
pub struct Wal {
    file: File,
    bytes: u64,
}

impl Wal {
    /// Opens the log at `path`, creating it when it does not exist.
    pub fn open(path: &Path) -> io::Result<Wal> {
        let file = OpenOptions::new().create(true).append(true).open(path)?;
        let bytes = file.metadata()?.len();
        Ok(Wal { file, bytes })
    }

    /// Reads every record of the log at `path`, oldest first.
    pub fn replay(path: &Path) -> io::Result<Vec<Record>> {
        let bytes = fs::read(path)?;
        let mut records = Vec::new();
        let mut offset = 0;
        while offset < bytes.len() {
            let (record, len) = Record::decode(&bytes[offset..])?;
            records.push(record);
            offset += len;
        }
        Ok(records)
    }

    /// Appends one record and returns once it is on disk.
    pub fn append(&mut self, record: &Record) -> io::Result<()> {
        let bytes = record.encode();
        self.file.write_all(&bytes)?;
        // sync_data, not flush: flush only hands the bytes to the OS, and a record that is still
        // in the page cache is lost on power failure.
        self.file.sync_data()?;
        self.bytes += bytes.len() as u64;
        Ok(())
    }

    /// The size of the log, in bytes.
    pub fn bytes(&self) -> u64 {
        self.bytes
    }
}
