# profiled

The profile service of Larkspur Outdoor Club: a small HTTP server that keeps one JSON file per
member profile. It uses the Go standard library only.

## Layout

- `cmd/server`: the binary; reads the configuration and starts the server.
- `internal/config`: configuration from environment variables.
- `internal/storage`: the file store, one `<id>.json` per profile.
- `internal/api`: the HTTP handlers.

## Endpoints

| Method | Path             | What it does                         |
| ------ | ---------------- | ------------------------------------ |
| GET    | `/profiles/{id}` | Returns the profile as JSON.         |

## Configuration

| Variable            | Default  | Meaning                           |
| ------------------- | -------- | --------------------------------- |
| `PROFILED_ADDR`     | `:8080`  | The address the server listens on |
| `PROFILED_DATA_DIR` | `./data` | Where the profile files are kept  |

## Running

```sh
go run ./cmd/profiled
go test ./...
```
