import { CONSUMER_JWKS_URL, ENTERPRISE_JWKS_URL } from '../config.ts';
import type { Jwk, KeySet } from '../lib/jwt.ts';

/** Signing keys of the enterprise identity provider, which signs in work accounts. */
export const enterpriseKeys: KeySet = { keys: [] };

/** Signing keys of the consumer identity provider, which signs in personal accounts. */
export const consumerKeys: KeySet = { keys: [] };

/** Both providers' keys in one set, as GET /internal/keys lists them for the key-rotation monitor. */
export const allKeys: KeySet = { keys: [] };

/** Replaces both providers' keys. */
export function setKeys(enterprise: Jwk[], consumer: Jwk[]): void {
	enterpriseKeys.keys = enterprise;
	consumerKeys.keys = consumer;
	allKeys.keys = [...enterprise, ...consumer];
}

type FetchJson = (url: string) => Promise<{ keys: Jwk[] }>;

const fetchJson: FetchJson = async (url) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`GET ${url} answered ${response.status}`);
	return (await response.json()) as { keys: Jwk[] };
};

/** Fetches both providers' published keys. The server calls this at start and every 10 minutes. */
export async function refreshKeys(get: FetchJson = fetchJson): Promise<void> {
	const [enterprise, consumer] = await Promise.all([get(ENTERPRISE_JWKS_URL), get(CONSUMER_JWKS_URL)]);
	setKeys(enterprise.keys, consumer.keys);
}
