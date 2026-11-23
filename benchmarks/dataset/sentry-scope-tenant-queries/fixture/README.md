# beacon-api

The HTTP API of Beacon, Harbourlight's error and uptime monitoring. Customers sign up as an
organization, create projects in it, and send events to a project; dashboards chart those events
and alerts fire on them.

The service has no dependencies outside the standard library. Storage is the small in-memory
object layer in `core/db.py`, which reads like Django's: `Model.objects.get(...)`,
`.filter(...)`, `.create(...)` and `.update(...)`.

## Layout

- `core/db.py`: the object layer (`Model`, `Manager`, `QuerySet`).
- `core/models.py`: `User`, `Organization`, `Membership`, `Project`, `Dashboard`, `Alert`, `Event`.
- `core/slugs.py`: `slugify`, used for project slugs.
- `api/http.py`: `Request`, `Response` and the HTTP errors.
- `api/bases.py`: `OrganizationEndpoint`, the base class of every endpoint.
- `api/pagination.py`: `paginate`, for list endpoints.
- `api/serializers.py`: turns model objects into JSON-ready dicts.
- `api/endpoints/`: the endpoints, one module per resource.
- `api/urls.py`: the route table and `handle(request)`.
- `tests/`: the pytest suite.

## Endpoints

| Method | Path                                                         | What it does                 |
| ------ | ------------------------------------------------------------ | ---------------------------- |
| GET    | `/api/organizations/<org_slug>/projects/`                    | Lists the projects, paged    |
| POST   | `/api/organizations/<org_slug>/projects/`                    | Creates a project            |
| GET    | `/api/organizations/<org_slug>/projects/<project_id>/`       | Returns one project          |
| GET    | `/api/organizations/<org_slug>/projects/<project_id>/alerts/` | Lists a project's alerts     |

## Writing an endpoint

Subclass `OrganizationEndpoint`, add a method per HTTP verb (`get`, `post`, `put`, `delete`) that
takes `request`, `organization` and the route's named groups, and return a `Response`. Raise
`NotFound`, `BadRequest` or `Forbidden` from `api/http.py` for errors. Register the route in
`api/urls.py`.

## Tests

```sh
python3 -m pytest
```
