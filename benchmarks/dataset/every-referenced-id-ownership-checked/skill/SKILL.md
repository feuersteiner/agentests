---
name: every-referenced-id-ownership-checked
description: Use whenever you add or change an API endpoint, serializer field, viewset, custom action or bulk endpoint that takes ids of user-owned records (routines, slot entries, workout sessions, workout logs, templates) from the URL, the query string or the request body, including foreign keys inside the body and lists of items, even if the request says nothing about permissions. Covers checking that every referenced id belongs to, or is accessible by, the caller, not only the main object, and keeping get_owner_objects() in step with the serializer.
---

# Check the owner of every referenced id

## The rule

Every object ID taken from a request (path parameters, query strings and foreign keys inside the body, in single and bulk operations) must be checked to belong to, or be accessible by, the caller before it is read or linked, not only the top-level resource.

- Routine, SlotEntry, WorkoutSession and WorkoutLog rows each belong to one user through their `user_id`. A routine with `is_template` set is a template: it is accessible to its owner and, when `is_public` is set, to every user. Exercise rows are a shared catalogue that any user may reference.
- Viewsets over these rows extend `OwnerObjectViewSet`. Its `get_queryset()`, and so `self.get_object(pk)`, returns only the caller's rows. Its inherited `create()` and `update()` check only the body's foreign keys listed in the viewset's `get_owner_objects()`, as `(Model, "field")` pairs: a foreign key the serializer accepts but the list leaves out is never checked.
- Code that bypasses the inherited `create()` and `update()`, such as a custom `@action` or a bulk endpoint, gets no automatic check: each such id it takes from the request, including every id in every item of a list, is checked against `request.user` there, for example with `self.check_owner_objects(item)` for listed fields or a lookup that filters by `user_id=request.user.id`.

## Why

An authenticated route only proves who the caller is. A serializer field backed by a related
model only proves that the row exists, for any user. So a body that names another user's slot
entry, session or routine is accepted and stored, and that user's data changes under them. Real
advisories come from exactly this: a viewset checked two of a model's foreign keys, and a third,
added to the serializer later, was never added to the list. Tests with a single user never show it.

## How to apply it

1. When a serializer gains a writable foreign key to a user-owned model, add `(Model, "field")`
   to `get_owner_objects()` of every viewset that uses that serializer, in the same change.
2. In a custom `@action`, load the row named in the URL with `self.get_object(pk)`, never with
   `Model.objects.get(id=pk)`.
3. For every other id in the body or the query string, call `self.check_owner_objects(data)` with
   the field listed, or look the row up with `user_id=request.user.id`, before you read, copy or
   store it. Answer a foreign id like an unknown one.
4. In a bulk endpoint, check every item, and every user-owned field of each item, before saving
   it. Saving each item through the serializer skips the check `create()` does.
5. For a template, accept only the caller's own templates and public ones.

Common slips: adding a field to `fields` but not to `get_owner_objects()`; checking the main
object but not the target of a move or copy; a bulk loop that calls `serializer.save()` directly;
looking a template up by `id` and `is_template` alone.

## Example

A viewset over training goals, each tied to one of the user's routines.

Violating: `routine` is writable, but nothing checks whose routine it is.

```python
class GoalViewSet(OwnerObjectViewSet):
    serializer_class = GoalSerializer  # fields = ("id", "routine", "target_kg")
```

Compliant: the routine is checked on create and update, and the custom action checks it too.

```python
class GoalViewSet(OwnerObjectViewSet):
    serializer_class = GoalSerializer

    def get_owner_objects(self):
        return [(Routine, "routine")]

    @action(detail=True, methods=["post"])
    def retarget(self, request, pk):
        goal = self.get_object(pk)
        self.check_owner_objects(request.data)
        goal.routine_id = request.data["routine"]
        goal.save()
        return Response(GoalSerializer(goal).data)
```

## Before you commit

List every id the changed code takes from the URL, the query string and the body, including each
field of each item of a list. For each, point at the check that ties it to `request.user`, or to a
public template, before it is used. Fix any that has none and check again.
