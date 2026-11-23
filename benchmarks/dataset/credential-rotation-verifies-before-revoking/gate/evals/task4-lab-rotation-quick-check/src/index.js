// r2-gateway: takes the photo uploads of print orders, stores them in R2, records them in
// Postgres and sends completed orders to the print lab.

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/tiff', 'image/heic'];

/** The object key of one photo of an order: `orders/<order>/<index>.<ext>`. */
export function objectKey(orderId, index, filename) {
	const ext = filename.includes('.') ? filename.split('.').pop() : 'jpg';
	return `orders/${orderId}/${index}.${ext}`;
}

/** Whether an upload may go ahead, from its Content-Type and Content-Length headers. */
export function checkUpload(contentType, contentLength) {
	if (!ALLOWED_TYPES.includes(contentType)) return { ok: false, status: 415, error: 'unsupported type' };
	if (Number(contentLength) > MAX_UPLOAD_BYTES) return { ok: false, status: 413, error: 'too large' };
	return { ok: true };
}

const json = (body, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const storage = (env, key, init = {}) =>
	fetch(`${env.STORAGE_ENDPOINT}/${env.BUCKET}/${key}`, {
		...init,
		headers: { ...init.headers, authorization: `R2 ${env.STORAGE_KEY_ID}:${env.STORAGE_KEY_SECRET}` }
	});

const sql = (env, query, params) =>
	fetch(env.DB_HTTP_ENDPOINT, {
		method: 'POST',
		headers: { 'x-connection-string': env.DATABASE_URL, 'x-application-name': env.APP_NAME },
		body: JSON.stringify({ query, params })
	});

const lab = (env, path, init = {}) =>
	fetch(`${env.LAB_API}${path}`, {
		...init,
		headers: { ...init.headers, authorization: `Bearer ${env.LAB_API_TOKEN}` }
	});

async function health(env) {
	const [bucket, printLab] = await Promise.all([storage(env, '', { method: 'HEAD' }), lab(env, '/v1/ping')]);
	const body = { storage: bucket.ok ? 'ok' : 'down', lab: printLab.ok ? 'ok' : 'down' };
	return json(body, bucket.ok && printLab.ok ? 200 : 503);
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (request.method === 'GET' && url.pathname === '/healthz') return health(env);

		const complete = url.pathname.match(/^\/orders\/([\w-]+)\/complete$/);
		if (request.method === 'POST' && complete) {
			const response = await lab(env, '/v1/jobs', { method: 'POST', body: JSON.stringify({ order: complete[1] }) });
			return json({ sent: response.ok }, response.ok ? 202 : 502);
		}

		const photo = url.pathname.match(/^\/orders\/([\w-]+)\/photos\/(\d+)$/);
		if (request.method !== 'PUT' || !photo) return json({ error: 'not found' }, 404);
		const [, orderId, index] = photo;
		const type = request.headers.get('content-type');
		const check = checkUpload(type, request.headers.get('content-length'));
		if (!check.ok) return json({ error: check.error }, check.status);

		const key = objectKey(orderId, Number(index), url.searchParams.get('filename') ?? 'photo.jpg');
		const stored = await storage(env, key, { method: 'PUT', body: request.body, headers: { 'content-type': type } });
		if (!stored.ok) return json({ error: 'storage failed' }, 502);
		await sql(env, 'insert into uploads (order_id, object_key) values ($1, $2)', [orderId, key]);
		return json({ key }, 201);
	}
};
