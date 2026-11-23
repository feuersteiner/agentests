# Tenant queries are scoped

The endpoint modules under `api/endpoints/` serve several organizations from the same tables. In
every one of them:

Every lookup of tenant-owned data filters by the caller's organization or project as well as by the object id, and ids taken from the URL or request body are never trusted on their own.

- Organization, Project, Dashboard, Alert and Event are tenant-owned: Project, Dashboard, Alert and Event rows each belong to one organization through their `organization_id` foreign key.
- Endpoints subclass `OrganizationEndpoint`, which resolves the caller's organization from the URL slug, checks membership and passes it to the handler as `organization`. Every other id that arrives in the URL path, the query string or the request body, single or in a list, is caller-supplied.
- The organization or project filter is part of the query that uses the caller-supplied id, as in `Dashboard.objects.get(id=dashboard_id, organization_id=organization.id)`; a project counts as a filter only when it was itself loaded with the organization filter. Loading a row by id alone and comparing its owner afterwards, or storing a caller-supplied id on a row without such a lookup, breaks the rule.

A query that uses no caller-supplied id, such as listing the projects of `organization`, needs
only the filter it already has. A module that does not query these models has nothing to check.
