/** GET /healthz: answers while the process is up, without asking the reports API. */
export function health(): Response {
	return Response.json({ status: 'ok' });
}
