# Rubric: tenant queries are scoped

## The rule

Every lookup of tenant-owned data filters by the caller's organization or project as well as by the object id, and ids taken from the URL or request body are never trusted on their own.

- Organization, Project, Dashboard, Alert and Event are tenant-owned: Project, Dashboard, Alert and Event rows each belong to one organization through their `organization_id` foreign key.
- Endpoints subclass `OrganizationEndpoint`, which resolves the caller's organization from the URL slug, checks membership and passes it to the handler as `organization`. Every other id that arrives in the URL path, the query string or the request body, single or in a list, is caller-supplied.
- The organization or project filter is part of the query that uses the caller-supplied id, as in `Dashboard.objects.get(id=dashboard_id, organization_id=organization.id)`; a project counts as a filter only when it was itself loaded with the organization filter. Loading a row by id alone and comparing its owner afterwards, or storing a caller-supplied id on a row without such a lookup, breaks the rule.

## What to look at

Read every line of endpoint code the diff adds or changes, wherever the agent put it (an endpoint
module, a helper, a model method), and list each place where an id from the request is used: a
named group of the URL path other than the organization slug, a query-string value, a body field,
a list of ids in the body. For each one ask:

1. **Is the query scoped?** The `get` or `filter` call that uses the id also carries
   `organization_id=organization.id` (or `organization=organization`), or a `project_id` taken from
   a project object that was itself loaded with the organization filter. `organization` must be the
   one the handler was given, never an organization id read from the request.
2. **Are secondary ids scoped too?** A target project chosen in the body, a project id in the query
   string and every id in a list need the same filter as the main object. A bulk `update` over
   `id__in=...` with no organization filter is the rule broken once for every id.
3. **Is the scoping in the query?** Loading by id alone and then comparing `row.organization_id`
   with `organization.id` in Python is worth more than no check and less than a scoped query.
4. **Is any caller-supplied id stored unchecked?** Writing a `project_id` from the body onto a new
   or updated row without first loading that project through a scoped query breaks the rule.

Lookups by values that do not come from the request (the `organization` argument, ids of rows
already loaded through a scoped query) need nothing more. Tests the agent wrote are not graded
against the rule. Every endpoint was scoped before the agent started, so an unscoped lookup in the
diff is the agent's. The prompt's other steps count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the endpoint is built, but ids from the request are looked up or stored with no
  organization or project filter; membership of the URL's organization is the only check.
- **4 to 6**: partly scoped: the main lookup is scoped and a secondary id is not, or ownership is
  checked by loading by id and comparing in Python instead of in the query.
- **7 to 9**: every lookup by a caller-supplied id is scoped in its query, with a minor lapse, or
  the rule is fully followed and a step of the task is missing or half done.
- **10**: every step is done and every query that uses a caller-supplied id carries the
  organization filter or a filter by a scoped project; no caller-supplied id is stored unchecked.

What each looks like:

- **2**: `Dashboard.objects.get(id=dashboard_id)`, `Alert.objects.filter(id__in=ids).update(...)`,
  or `Event.objects.filter(project_id=request.query["project_id"])`, with nothing tying the rows to
  `organization`. Any member of any organization can read or change another tenant's data.
- **5**: the source dashboard is loaded with `organization_id=organization.id`, but the copy is
  created with the body's `project_id` as given; or every row is loaded by id alone and followed by
  `if row.organization_id != organization.id: raise NotFound(...)`.
- **8**: all lookups are scoped in the query and the endpoint works, but the README or CHANGELOG
  step was skipped or a requested test is missing.
- **10**: for example `Project.objects.get(id=project_id, organization_id=organization.id)` and
  then `Event.objects.filter(organization_id=organization.id, project_id=project.id)`; unknown and
  foreign ids both give 404 or are left out of a bulk result; all other steps are done.
