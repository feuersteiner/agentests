# Rubric: no queries in serialize

## The rule

Serializers that run once per object never query the database in the per-object method; related data for the whole list is fetched in bulk beforehand (in get_attrs) and the per-object method only reads what was prefetched.

- A serializer subclasses `Serializer` from `api/serializers/base.py`. Its `get_attrs(item_list, user)` runs once for the whole list and returns the attrs of each item; its `serialize(obj, attrs, user)` then runs once per object, with that object's attrs.
- Every `.objects` query runs a database query, and so does every use of a relation of a model object, whether a foreign key such as `project.team` or a reverse set such as `project.member_set`: relations of Project, Team, Member, Environment, Release, Issue and Bookmark load lazily, each time they are used. Reading an object's own fields, such as `project.name` or `project.team_id`, runs no query.
- In bulk means one query per kind of related data for the whole list, such as `Member.objects.filter(project_id__in=[project.id for project in item_list])`, never one query per item, whether in `serialize`, in a helper it calls, or in a loop over `item_list` in `get_attrs`.

## What to look at

Find every new or changed key of the serialized project (or of any other serializer the diff
touches) that comes from related data: a team's name, a count of members or open issues, the
latest release, whether the user bookmarked the project. For each one, trace where its value
comes from:

1. **In `serialize`, or in anything it calls:** an `X.objects...` call, a relation such as
   `obj.team`, `obj.release_set`, `obj.issue_set.filter(...)` or `release.project`, a nested
   `serialize(...)` of a related object, or a call to a helper or model method or property the
   diff adds that does one of these. Each is one query per object: a violation.
2. **In `get_attrs`:** the related data must come from one query per kind of data for the whole
   list, filtered with `__in` over the list's ids (or `in_bulk` over the collected `team_id`s),
   then grouped in Python. A loop or comprehension over `item_list` that runs a query or follows a
   relation for each item is the same N+1, moved: a violation.
3. **What `serialize` reads:** values from `attrs` (including fields of objects `get_attrs` already
   loaded, such as `attrs["team"].name`), `user`, and `obj`'s own fields. That is compliant.

Queries in endpoint code that run once per request (loading a project by slug, the list query)
are not what the rule is about, and tests the agent wrote are not graded against it. Every
serializer complied before the agent started, so a per-object query in the diff is the agent's.
The prompt's other steps count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: every new field is queried per object (in `serialize`, in a helper it calls, or in
  a per-item loop in `get_attrs`), perhaps with one field done in bulk.
- **4 to 6**: about half the new fields are fetched in bulk and the rest per object; or all are in
  `get_attrs` but one relation is still followed per object (such as `obj.team.name` in
  `serialize` beside bulk member counts).
- **7 to 9**: every new field comes from bulk queries in `get_attrs` and `serialize` reads only
  `attrs`, with a minor lapse (such as one more bulk query than needed), or a step of the task is
  missing or half done.
- **10**: every step is done, each kind of related data is fetched once for the whole list in
  `get_attrs`, and `serialize` only reads `attrs`, `user` and `obj`'s own fields.

What each looks like:

- **2**: `Member.objects.filter(project_id=obj.id).count()` and `obj.team.name` in `serialize`;
  or `obj.release_set.order_by("-date_released").first()`; or a `Bookmark.objects...exists()`
  per project; or `project.issue_set.filter(status="open").count()` per item in `get_attrs`.
- **5**: team names come from `Team.objects.in_bulk(...)` in `get_attrs`, but the member count is
  still `obj.member_set.count()` in `serialize`.
- **8**: open-issue counts come from one `Issue.objects.filter(project_id__in=..., status="open")`
  in `get_attrs` and `serialize` reads `attrs["open_issues"]`, but the README or CHANGELOG step or a
  requested test is missing.
- **10**: the same bulk pattern for every new field, with defaults for projects that have no
  related rows (a count of 0, no latest release, not bookmarked), and every other step done.
