---
name: sentry-no-queries-in-serialize
description: Use whenever you add or change a field in an API serializer (a `Serializer` subclass under `api/serializers/` with `get_attrs` and `serialize`), above all a field built from related records such as a related object's name, a count, a child record or a per-user flag, even if the request says nothing about performance or queries. Covers fetching related data in bulk in `get_attrs` so that the per-object `serialize` method never queries the database (N+1 queries).
---

# No queries in serialize

## The rule

Serializers that run once per object never query the database in the per-object method; related data for the whole list is fetched in bulk beforehand (in get_attrs) and the per-object method only reads what was prefetched.

- A serializer subclasses `Serializer` from `api/serializers/base.py`. Its `get_attrs(item_list, user)` runs once for the whole list and returns the attrs of each item; its `serialize(obj, attrs, user)` then runs once per object, with that object's attrs.
- Every `.objects` query runs a database query, and so does every use of a relation of a model object, whether a foreign key such as `project.team` or a reverse set such as `project.member_set`: relations of Project, Team, Member, Environment, Release, Issue and Bookmark load lazily, each time they are used. Reading an object's own fields, such as `project.name` or `project.team_id`, runs no query.
- In bulk means one query per kind of related data for the whole list, such as `Member.objects.filter(project_id__in=[project.id for project in item_list])`, never one query per item, whether in `serialize`, in a helper it calls, or in a loop over `item_list` in `get_attrs`.

## Why

A list endpoint serializes every object on the page. One query in `serialize` becomes one query
per row: 25 extra round trips on a page of 25, more as pages grow, and one more set for every
field added the same way. Tests with one or two objects never show it, and `obj.team.name` does
not look like a query, so it has to be a habit.

## How to apply it

1. In `get_attrs`, collect the ids first: `ids = [obj.id for obj in item_list]`, or the
   foreign-key ids such as `{obj.team_id for obj in item_list}`.
2. Run one query per kind of related data with `__in` over those ids, or `in_bulk(...)` for
   rows looked up by id, and group the result in Python (a `dict`, `defaultdict` or `Counter`).
3. Return each item's attrs with a default for items that have no related rows (0, `None`,
   `False`, `[]`).
4. In `serialize`, read only `attrs`, `user` and `obj`'s own fields.

Common slips: `obj.team.name` or `obj.member_set.count()` in `serialize`; a nested
`serialize(obj.something, ...)` per object; a helper method that `serialize` calls and that
queries; moving the query into `get_attrs` but still running it inside a loop over `item_list`.

## Example

A team serializer that lists the slugs of the team's projects.

Violating: one query per team.

```python
def serialize(self, obj, attrs, user):
    return {"id": str(obj.id), "projects": [p.slug for p in obj.project_set]}
```

Compliant: one query for all the teams, then a dictionary lookup per team.

```python
def get_attrs(self, item_list, user):
    slugs = defaultdict(list)
    for project in Project.objects.filter(team_id__in=[team.id for team in item_list]):
        slugs[project.team_id].append(project.slug)
    return {team: {"projects": sorted(slugs[team.id])} for team in item_list}

def serialize(self, obj, attrs, user):
    return {"id": str(obj.id), "projects": attrs["projects"]}
```

## Before you commit

For each serializer you changed, read `serialize` and everything it calls, and the loops in
`get_attrs`. Point at every `.objects` call and every relation (`obj.x`, `obj.x_set`): each must
sit in `get_attrs`, outside any loop over `item_list`. Fix what fails and check again before you
commit.
