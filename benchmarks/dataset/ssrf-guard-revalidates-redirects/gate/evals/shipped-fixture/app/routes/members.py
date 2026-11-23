"""Member profiles. A member's website gets a preview card that shows the site's title."""

from app import preview, store
from app.web import App, Request, Response, error


def register(app: App) -> None:
    app.route("GET", "/members/<member_id>")(get_member)
    app.route("PUT", "/members/<member_id>")(update_member)


def member_json(member: store.Member) -> dict:
    return {
        "id": member.id,
        "name": member.name,
        "bio": member.bio,
        "website": member.website,
        "website_title": member.website_title,
    }


def get_member(request: Request, member_id: str) -> Response:
    member = store.members.get(member_id)
    if member is None:
        return error(404, "no such member")
    return Response(member_json(member))


def update_member(request: Request, member_id: str) -> Response:
    member = store.members.get(member_id)
    if member is None:
        return error(404, "no such member")
    if request.member_id != member_id:
        return error(403, "you can only edit your own profile")
    body = request.json or {}
    if "name" in body:
        member.name = body["name"]
    if "bio" in body:
        member.bio = (body["bio"] or "").strip()
    if "website" in body:
        website = body["website"] or None
        if website is not None and not website.startswith(("http://", "https://")):
            return error(400, "website must start with http:// or https://")
        member.website = website
        member.website_title = preview.fetch_site_title(website) if website else None
    return Response(member_json(member))
