use std::fs;
use std::path::PathBuf;

use kvstore::Store;

fn fresh_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("kvstore-test-{}-{name}", std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    dir
}

#[test]
fn set_then_get() {
    let dir = fresh_dir("set-then-get");
    let mut store = Store::open(&dir).unwrap();
    store.set("region", b"eu-west").unwrap();
    assert_eq!(store.get("region"), Some(&b"eu-west"[..]));
    assert_eq!(store.get("zone"), None);
    assert_eq!(store.len(), 1);
}

#[test]
fn set_replaces_the_old_value() {
    let dir = fresh_dir("set-replaces");
    let mut store = Store::open(&dir).unwrap();
    store.set("region", b"eu-west").unwrap();
    store.set("region", b"us-east").unwrap();
    assert_eq!(store.get("region"), Some(&b"us-east"[..]));
    assert_eq!(store.len(), 1);
}

#[test]
fn delete_removes_the_key() {
    let dir = fresh_dir("delete-removes");
    let mut store = Store::open(&dir).unwrap();
    store.set("region", b"eu-west").unwrap();
    assert!(store.delete("region").unwrap());
    assert_eq!(store.get("region"), None);
    assert!(store.is_empty());
}

#[test]
fn delete_of_a_missing_key_logs_nothing() {
    let dir = fresh_dir("delete-missing");
    let mut store = Store::open(&dir).unwrap();
    assert!(!store.delete("region").unwrap());
    assert_eq!(store.log_bytes(), 0);
}

#[test]
fn reopening_replays_the_log() {
    let dir = fresh_dir("reopen");
    {
        let mut store = Store::open(&dir).unwrap();
        store.set("region", b"eu-west").unwrap();
        store.set("zone", b"b").unwrap();
        store.delete("zone").unwrap();
    }
    let store = Store::open(&dir).unwrap();
    assert_eq!(store.get("region"), Some(&b"eu-west"[..]));
    assert_eq!(store.get("zone"), None);
    assert_eq!(store.len(), 1);
}

#[test]
fn log_bytes_grows_with_every_write() {
    let dir = fresh_dir("log-bytes");
    let mut store = Store::open(&dir).unwrap();
    store.set("a", b"1").unwrap();
    assert_eq!(store.log_bytes(), 11);
    store.set("a", b"22").unwrap();
    assert_eq!(store.log_bytes(), 23);
}
