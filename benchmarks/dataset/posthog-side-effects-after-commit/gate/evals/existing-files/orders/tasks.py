"""The background task queue. A task is queued with `.delay()` and run later by the worker."""

from orders import models

queue: list[tuple["Task", tuple]] = []
rendered_pdfs: dict[str, bytes] = {}


class Task:
    def __init__(self, function) -> None:
        self.function = function
        self.name = function.__name__

    def delay(self, *arguments) -> None:
        """Queue the task for the worker."""
        queue.append((self, arguments))


def task(function) -> Task:
    return Task(function)


def run_pending() -> int:
    """Run every queued task, as the worker does, and return how many ran."""
    ran = 0
    while queue:
        queued, arguments = queue.pop(0)
        queued.function(*arguments)
        ran += 1
    return ran


@task
def render_invoice_pdf(invoice_id: int) -> None:
    """Render the invoice's PDF."""
    invoice = models.get_invoice(invoice_id)
    if invoice is None:
        raise LookupError(f"invoice {invoice_id} does not exist")
    order = models.get_order(invoice["order_id"])
    rendered_pdfs[invoice["number"]] = f"%PDF {invoice['number']} total {order['total_cents']}".encode()
