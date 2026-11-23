# Tidegate

Tidegate is the sync gateway behind Harbourline's mobile apps: it authenticates app users, keeps
their sessions and imports documents written straight to the bucket by back-office tools into a
database the apps can sync. It is a plain Go module with no dependencies outside the standard
library.

## Layout

- `base/`: logging shared by every package.
- `auth/`: password login, sessions and OpenID Connect sign-in.
- `db/`: revision ids and the document import.
- `rest/`: the HTTP API.

## HTTP API

| Method   | Path        | What it does                                         |
| -------- | ----------- | ---------------------------------------------------- |
| `POST`   | `/_session` | Logs in with a JSON `name` and `password`.           |
| `GET`    | `/_session` | Returns the user of the session cookie.              |
| `DELETE` | `/_session` | Logs out.                                            |

## Configuration

| Key                   | Default  | Meaning                                              |
| --------------------- | -------- | ---------------------------------------------------- |
| `session_ttl`         | 24 hours | How long a session lasts after login.                |
| `max_failed_logins`   | 10       | Failed logins in a row before an account is locked.  |
| `import_max_doc_size` | 20 MB    | Documents larger than this are not imported.         |

## Tests

```sh
go test ./...
```
