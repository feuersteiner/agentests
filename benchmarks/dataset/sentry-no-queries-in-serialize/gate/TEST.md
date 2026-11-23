# No queries in serialize

The serializers under `api/serializers/` build the JSON of list endpoints, so their per-object
method runs once for every object on the page. In every one of them:

Serializers that run once per object never query the database in the per-object method; related data for the whole list is fetched in bulk beforehand (in get_attrs) and the per-object method only reads what was prefetched.

- A serializer subclasses `Serializer` from `api/serializers/base.py`. Its `get_attrs(item_list, user)` runs once for the whole list and returns the attrs of each item; its `serialize(obj, attrs, user)` then runs once per object, with that object's attrs.
- Every `.objects` query runs a database query, and so does every use of a relation of a model object, whether a foreign key such as `project.team` or a reverse set such as `project.member_set`: relations of Project, Team, Member, Environment, Release, Issue and Bookmark load lazily, each time they are used. Reading an object's own fields, such as `project.name` or `project.team_id`, runs no query.
- In bulk means one query per kind of related data for the whole list, such as `Member.objects.filter(project_id__in=[project.id for project in item_list])`, never one query per item, whether in `serialize`, in a helper it calls, or in a loop over `item_list` in `get_attrs`.

A serializer whose `serialize` reads only `attrs`, `user` and the object's own fields, and whose
`get_attrs` (if it has one) queries only for the whole list, follows the rule. A file under
`api/serializers/` with no serializer in it has nothing to check.
