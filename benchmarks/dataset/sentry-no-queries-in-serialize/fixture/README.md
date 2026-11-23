# trellis-api

The HTTP API of Trellis, Pinewood Labs' issue tracker for software teams. Teams own projects;
projects have members, environments, releases and issues, and users bookmark the projects they
follow.

The service has no dependencies outside the standard library. Storage is the small in-memory
object layer in `core/db.py`, which stands in for Django's ORM: `Model.objects.get(...)`,
`.filter(...)`, `.order_by(...)`, `.create(...)`, and relations such as `project.team` or
`project.release_set` that work like Django's.

## Layout

- `core/db.py`: the object layer (`Model`, `Manager`, `QuerySet`, `ForeignKey`, `ReverseSet`).
- `core/models.py`: `User`, `Team`, `Project`, `Member`, `Environment`, `Release`, `Issue`,
  `Bookmark`.
- `api/http.py`: `Request`, `Response` and the HTTP errors.
- `api/pagination.py`: `paginate`, for list endpoints.
- `api/serializers/`: the project and release serializers, and
  `serialize(objects, user, serializer)` in `base.py`, which endpoints call to build their JSON.
- `api/endpoints/projects.py`: the project endpoints.
- `api/urls.py`: the route table and `handle(request)`.
- `tests/`: the pytest suite.

## API

| Method | Path                             | What it does                                        |
| ------ | -------------------------------- | --------------------------------------------------- |
| GET    | `/api/projects/`                 | Lists the projects, paged with `cursor` and `limit` |
| GET    | `/api/projects/<slug>/`          | Returns one project                                 |
| GET    | `/api/projects/<slug>/releases/` | Lists a project's releases, newest first            |

A page of the project list is `{"results": [...], "next": <cursor or null>}`.

### Project

| Key            | Value                                             |
| -------------- | ------------------------------------------------- |
| `id`           | The project's id, as a string                     |
| `slug`         | The project's slug                                |
| `name`         | The project's name                                |
| `platform`     | The main language or framework, or `""`           |
| `dateCreated`  | When the project was created, ISO 8601            |
| `environments` | The names of the project's environments, sorted   |

### Release

| Key            | Value                                  |
| -------------- | -------------------------------------- |
| `id`           | The release's id, as a string          |
| `version`      | The version string, such as `"2.4.0"`  |
| `dateReleased` | When it was released, ISO 8601         |

## Tests

```sh
python3 -m pytest
```
