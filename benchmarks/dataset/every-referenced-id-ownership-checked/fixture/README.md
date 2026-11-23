# liftbook-api

The HTTP API of Liftbook, Northmoor's workout planner and training log. A user builds routines
of slot entries (an exercise with its planned sets, reps and weight), records each visit to the
gym as a workout session, and logs every set in it. Routines can be kept as templates, and a
public template can be used by anyone.

The service has no dependencies outside the standard library. Storage is the in-memory object
layer in `core/db.py`, and `core/rest.py` is a small REST layer that reads like Django REST
Framework: serializers, viewsets, `@action` routes and a router.

## Layout

- `core/db.py`: the object layer (`Model`, `Manager`, `QuerySet`).
- `core/rest.py`: `Request`, `Response`, the API errors, `ModelSerializer`, the viewsets,
  `action` and `Router`.
- `core/viewsets.py`: `OwnerObjectViewSet`, the base of every viewset over a user's own rows.
- `manager/models.py`: `User`, `Exercise`, `Routine`, `SlotEntry`, `WorkoutSession`,
  `WorkoutLog`.
- `manager/api/views.py`: the serializer and the viewset of each resource.
- `manager/api/urls.py`: the router and `handle(request)`.
- `manager/stats.py`: one-rep-max estimates and weekly volume.
- `manager/units.py`: kg and lb conversion and plate maths.
- `tests/`: the pytest suite.

## Endpoints

Every path is under `/api/`. Each resource has the usual list, create, retrieve, update and
delete routes unless the table says otherwise.

| Path                   | Resource                                          |
| ---------------------- | ------------------------------------------------- |
| `/api/exercises/`      | The exercise catalogue (list and retrieve only)   |
| `/api/routines/`       | The user's routines                               |
| `/api/templates/`      | Templates the user can start from (read only)     |
| `/api/slot-entries/`   | The slot entries of the user's routines           |
| `/api/sessions/`       | The user's workout sessions                       |
| `/api/logs/`           | The user's workout logs                           |

## Tests

```sh
python3 -m pytest
```
