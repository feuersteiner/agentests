use kvstore::Store;

fn main() -> std::io::Result<()> {
    let dir = std::env::temp_dir().join("kvstore-demo");
    let mut store = Store::open(&dir)?;

    store.set("user:ana", b"admin")?;
    store.set("user:bo", b"viewer")?;
    store.set("theme", b"dark")?;
    store.delete("theme")?;

    println!("{} keys, {} bytes of log", store.len(), store.log_bytes());
    if let Some(role) = store.get("user:ana") {
        println!("user:ana = {}", String::from_utf8_lossy(role));
    }
    Ok(())
}
