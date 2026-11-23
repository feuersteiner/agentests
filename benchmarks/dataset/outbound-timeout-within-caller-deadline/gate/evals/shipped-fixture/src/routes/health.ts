/** GET /health: answers while the process is up. */
export function health(): Response {
	return Response.json({ status: 'ok' });
}
