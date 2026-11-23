"""The HTTP endpoints for customers."""

from app.http import Request, Response, Router, json_response

router = Router()


@router.get("/customers/<int:customer_id>")
def show_customer(request: Request, db, customer_id: int) -> Response:
    row = db.execute("SELECT id, name, email FROM customers WHERE id = ?", (customer_id,)).fetchone()
    if not row:
        return json_response({"error": f"no customer {customer_id}"}, 404)
    return json_response({"id": row["id"], "name": row["name"], "email": row["email"]})
