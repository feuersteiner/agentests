use kvstore::Store;

fn main() -> std::io::Result<()> {
    let dir = std::env::temp_dir().join("kvstore-demo");
    // Remove the directory left by the last run
    if dir.exists() {
        std::fs::remove_dir_all(&dir)?;
    }
    // Open the store
    let mut store = Store::open(&dir)?;

    // ---------- Writes ----------

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
