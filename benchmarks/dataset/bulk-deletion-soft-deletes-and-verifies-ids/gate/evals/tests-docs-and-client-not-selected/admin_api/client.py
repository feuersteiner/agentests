"""A client for the Pebblework platform's admin API.

Every customer resource has an id such as "r-5d2c81", unique across all types, and a "type":

- "account": a customer account. Fields: "name", "plan" ("trial", "team" or "business"),
  "trial_ends_at" (the ISO date its trial ends or ended, kept after an upgrade) and
  "owner_email".
- "site": a site of an account, holding everything its users made. Fields: "name",
  "account_id" and "status" ("active" or "closed").
- "app": an app installed on a site. Fields: "site_id" and "app_key" ("boards", "docs" or
  "insight").
- "workspace": a group of projects on a site. Fields: "name" and "site_id".
- "project": a project in a workspace. Fields: "name" and "workspace_id".
"""

from urllib.parse import urlencode

from admin_api import http


def get(resource_id: str) -> dict:
    """The resource with this id, whatever its type; raises http.NotFound when there is none."""
    return http.request("GET", f"/resources/{resource_id}")


def find(resource_type: str, **fields: str) -> list[dict]:
    """Every resource of this type whose fields equal the values given, e.g. find("site", account_id="r-1")."""
    query = urlencode({"type": resource_type, **fields})
    return http.request("GET", "/resources?" + query)["resources"]


def update(resource_id: str, **fields) -> dict:
    """Change some fields of a resource and return the resource as it is now."""
    return http.request("PATCH", f"/resources/{resource_id}", fields)


def notify(account_id: str, template: str) -> None:
    """Email the owner of an account, using one of the platform's message templates."""
    http.request("POST", f"/resources/{account_id}/notify", {"template": template})


def delete(resource_id: str, permanent: bool = True) -> None:
    """Delete the resource with this id, whatever its type, together with everything inside it.

    With permanent=True, the default, the data is erased at once. With permanent=False it goes to
    the platform's trash, and restore() can bring it back for 30 days.
    """
    flag = "true" if permanent else "false"
    http.request("DELETE", f"/resources/{resource_id}?permanent={flag}")


def restore(resource_id: str) -> None:
    """Bring a resource, and everything that was deleted with it, back from the trash."""
    http.request("POST", f"/resources/{resource_id}/restore")
