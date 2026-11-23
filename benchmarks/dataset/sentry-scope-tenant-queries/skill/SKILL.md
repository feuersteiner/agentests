---
name: sentry-scope-tenant-queries
description: Use whenever you add or change an API endpoint, view or handler in a multi-tenant service that reads, updates, copies, exports or deletes organization-owned records (projects, dashboards, alerts, events) by an id from the URL path, the query string or the request body, including bulk operations over a list of ids, even if the request says nothing about security or tenants. Covers how to scope every such query to the caller's organization or project so one tenant cannot reach another's data.
---

# Scope tenant queries

## The rule

Every lookup of tenant-owned data filters by the caller's organization or project as well as by the object id, and ids taken from the URL or request body are never trusted on their own.

- Organization, Project, Dashboard, Alert and Event are tenant-owned: Project, Dashboard, Alert and Event rows each belong to one organization through their `organization_id` foreign key.
- Endpoints subclass `OrganizationEndpoint`, which resolves the caller's organization from the URL slug, checks membership and passes it to the handler as `organization`. Every other id that arrives in the URL path, the query string or the request body, single or in a list, is caller-supplied.
- The organization or project filter is part of the query that uses the caller-supplied id, as in `Dashboard.objects.get(id=dashboard_id, organization_id=organization.id)`; a project counts as a filter only when it was itself loaded with the organization filter. Loading a row by id alone and comparing its owner afterwards, or storing a caller-supplied id on a row without such a lookup, breaks the rule.

## Why

`OrganizationEndpoint` proves only that the caller belongs to the organization in the URL. It says
nothing about the ids that come with the request: a member of one organization can send the id of
another organization's dashboard, alert or project. A query by id alone then reads or changes
another tenant's data (an insecure direct object reference). Tests with a single organization
never show it, so the filter has to be a habit, not something a failing test reminds you of.

## How to apply it

For every id that reaches a handler from the path, the query string or the body:

1. Put the tenant filter in the same query as the id: `organization_id=organization.id`, or
   `project_id=project.id` for a `project` you loaded with the organization filter.
2. Treat secondary ids the same as the main one: a target project, a parent id, each id of a list.
3. For lists of ids, filter the whole queryset by organization before `update` or `delete`, and
   decide what to do about ids that matched nothing (skip them or answer 404).
4. Before you store an id from the request on a row, load the object it names through a scoped
   query and store that object's id.
5. Answer a foreign id exactly like an unknown one (404), so the response does not reveal that the
   row exists.

Common slips: scoping the object named in the URL but not the one named in the body; `id__in=ids`
with no organization filter; filtering events or alerts by a `project_id` straight from the query
string; loading by id and comparing `organization_id` afterwards; reading an organization id from
the request instead of using `organization`.

## Example

A handler that moves an alert to another project of the same organization.

Violating: both ids are trusted because the caller is a member of the URL's organization.

```python
def post(self, request, organization, alert_id):
    alert = Alert.objects.get(id=int(alert_id))
    alert.project_id = request.data["project_id"]
    alert.save()
```

Compliant: each id is looked up together with the organization, and a miss is a 404.

```python
def post(self, request, organization, alert_id):
    try:
        alert = Alert.objects.get(id=int(alert_id), organization_id=organization.id)
        project = Project.objects.get(
            id=int(request.data["project_id"]), organization_id=organization.id
        )
    except (Alert.DoesNotExist, Project.DoesNotExist):
        raise NotFound("Not found")
    alert.project_id = project.id
    alert.save()
```

## Before you commit

Go through the staged endpoint code and list every value that comes from the path, the query
string or the body. For each one, point at the query that uses it and confirm the organization or
scoped-project filter is in that same call, and that no such id is written to a row unchecked. Fix
what fails and check again before you commit.
