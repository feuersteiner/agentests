# Every referenced id is ownership-checked

The API modules under `manager/api/` define the serializers and viewsets of Liftbook's training
records. In each of them:

Every object ID taken from a request (path parameters, query strings and foreign keys inside the body, in single and bulk operations) must be checked to belong to, or be accessible by, the caller before it is read or linked, not only the top-level resource.

- Routine, SlotEntry, WorkoutSession and WorkoutLog rows each belong to one user through their `user_id`. A routine with `is_template` set is a template: it is accessible to its owner and, when `is_public` is set, to every user. Exercise rows are a shared catalogue that any user may reference.
- Viewsets over these rows extend `OwnerObjectViewSet`. Its `get_queryset()`, and so `self.get_object(pk)`, returns only the caller's rows. Its inherited `create()` and `update()` check only the body's foreign keys listed in the viewset's `get_owner_objects()`, as `(Model, "field")` pairs: a foreign key the serializer accepts but the list leaves out is never checked.
- Code that bypasses the inherited `create()` and `update()`, such as a custom `@action` or a bulk endpoint, gets no automatic check: each such id it takes from the request, including every id in every item of a list, is checked against `request.user` there, for example with `self.check_owner_objects(item)` for listed fields or a lookup that filters by `user_id=request.user.id`.

A module that takes no Routine, SlotEntry, WorkoutSession or WorkoutLog id from a request has
nothing to check.
