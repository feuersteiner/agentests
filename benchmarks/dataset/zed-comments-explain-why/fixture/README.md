# kvstore

A small embedded key-value store, written by the storage team at Tidewater Labs for the tools that
need to remember a few thousand settings between runs. It has no dependencies.

Every key lives in memory. Every write is appended to a write-ahead log, `kv.log`, in the store's
directory, and synced before the call returns. Opening a store replays the log.

## Usage

```rust
use kvstore::Store;

fn main() -> std::io::Result<()> {
    let mut store = Store::open("data")?;
    store.set("region", b"eu-west")?;
    assert_eq!(store.get("region"), Some(&b"eu-west"[..]));
    store.remove("region")?;
    Ok(())
}
```

## API

| Method                  | What it does                                         |
| ----------------------- | ---------------------------------------------------- |
| `Store::open(dir)`      | Opens the store in `dir`, replaying its log.         |
| `store.set(key, value)` | Stores `value` under `key`, replacing any old value. |
| `store.get(key)`        | Returns the value under `key`, if there is one.      |
| `store.len()`           | The number of keys.                                  |
| `store.is_empty()`      | Whether the store holds no key.                      |
| `store.log_bytes()`     | The size of the log on disk, in bytes.               |

## The log

A record is one byte for the operation (1 for a set, 2 for a delete), the key's length and the
value's length as little-endian `u32`s, then the key and the value. A delete has an empty value.

## Development

```sh
cargo test
cargo run --example demo
```
