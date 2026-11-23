//! An embedded key-value store that keeps every key in memory and logs every write to disk.

mod store;
mod wal;

pub use store::Store;
