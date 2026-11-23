# marginalia

The API behind Field Notes, the blog of Corvid & Finch, a birding magazine: published posts,
readers' comments and the editors' moderation queue. It is one Go module with no dependencies
outside the standard library. The store keeps its tables in memory, and `cmd/server` seeds it
with a few sample rows.

## Layout

- `cmd/server/`: the binary; reads the configuration, seeds the store and starts the server.
- `internal/model/`: the database rows, one struct per table.
- `internal/store/`: the in-memory store.
- `internal/handler/`: the HTTP handlers.
- `internal/router/`: the routes, in a public group and an admin group.

## Endpoints

| Method | Path                               | Group  | What it does                                                            |
| ------ | ---------------------------------- | ------ | ----------------------------------------------------------------------- |
| GET    | `/api/posts`                       | public | Lists the published posts, newest first.                                |
| GET    | `/api/posts/{slug}`                | public | Returns one post.                                                       |
| GET    | `/api/posts/{slug}/comments`       | public | Lists the post's approved comments, oldest first.                       |
| POST   | `/api/posts/{slug}/comments`       | public | Adds a comment from `{"name", "email", "body"}`; it waits for approval. |
| GET    | `/api/admin/comments/pending`      | admin  | Lists the comments waiting for approval, oldest first.                  |
| POST   | `/api/admin/comments/{id}/approve` | admin  | Approves a comment.                                                     |

Admin routes need the header `Authorization: Bearer <token>`.

## Configuration

| Variable                 | Default | Meaning                                                              |
| ------------------------ | ------- | -------------------------------------------------------------------- |
| `MARGINALIA_ADDR`        | `:8080` | The address the server listens on.                                   |
| `MARGINALIA_ADMIN_TOKEN` | none    | The editors' token for the admin routes; unset, they answer 401.     |

## Running

```sh
go run ./cmd/marginalia
go test ./...
```
