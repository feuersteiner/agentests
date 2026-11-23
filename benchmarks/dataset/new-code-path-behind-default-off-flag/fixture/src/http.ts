/** A request on its way through the gateway. */
export interface GatewayRequest {
	request: Request;
	/** The project making the request, from the x-project-id header the auth layer sets. */
	projectId: string;
	/** The region this gateway serves, such as "eu-west". */
	region: string;
	receivedAt: Date;
}

export type Handler = (req: GatewayRequest) => Promise<Response>;

/** Answers the request itself, or passes it on with next(req). */
export type Middleware = (req: GatewayRequest, next: Handler) => Promise<Response>;

/** Runs the middleware in order, then the handler. */
export function compose(middleware: Middleware[], handler: Handler): Handler {
	return middleware.reduceRight<Handler>((next, run) => (req) => run(req, next), handler);
}

/** A JSON error response, { "error": message }. */
export function reject(
	status: number,
	message: string,
	headers: Record<string, string> = {}
): Response {
	return Response.json({ error: message }, { status, headers });
}
