import { handle } from '../src/app.ts';

/** Sends one request to the app as the user of `token` and returns the status and the parsed body. */
export async function call(
	method: string,
	path: string,
	{ token, body }: { token?: string; body?: unknown } = {}
): Promise<{ status: number; body: any }> {
	const headers: Record<string, string> = {};
	if (token) headers.authorization = `Bearer ${token}`;
	if (body !== undefined) headers['content-type'] = 'application/json';
	const response = await handle(
		new Request(`http://cairn.test${path}`, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body)
		})
	);
	const text = await response.text();
	return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

/** A valid ed25519 public key that is not in the seed. */
export const NEW_KEY = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEeaYdU3CgNRrUmKjzJOD5rVC/r75MBE6knL45gejLVz';
export const NEW_KEY_FINGERPRINT = 'SHA256:VBQjcOI/zsqERKykSIqL+sKWC1ri9NHjPe56NQchCTI';
