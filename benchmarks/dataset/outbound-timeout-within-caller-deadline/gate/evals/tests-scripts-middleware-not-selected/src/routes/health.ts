import pkg from '../../package.json';

/** GET /health: answers while the process is up, with the running version. */
export function health(): Response {
	return Response.json({ status: 'ok', version: pkg.version });
}
