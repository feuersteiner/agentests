def handle_invoice_paid(event: dict) -> None:
    data = event.get("data", {})
    notify(data.get("invoice_id"), data.get("amount", 0))
