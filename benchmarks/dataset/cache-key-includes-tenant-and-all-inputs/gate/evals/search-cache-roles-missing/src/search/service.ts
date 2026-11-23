import type { RequestContext } from '../context.ts';
import { selectDocuments } from '../db.ts';
import { getJson, setJson } from '../cache.ts';

export interface SearchHit {
	id: string;
	title: string;
	snippet: string;
}

/**
 * The caller's organisation's documents whose title or body contains every word of q, ignoring
 * case. Restricted documents are left out unless the caller is an admin.
 */
export async function search(ctx: RequestContext, q: string): Promise<SearchHit[]> {
	const key = `search:${ctx.orgId}:${q.trim().toLowerCase()}`;
	const cached = await getJson<{ orgId: string; hits: SearchHit[] }>(key);
	if (cached && cached.orgId === ctx.orgId) return cached.hits;
	const hits = await runSearch(ctx, q);
	await setJson(key, { orgId: ctx.orgId, hits }, 300);
	return hits;
}

async function runSearch(ctx: RequestContext, q: string): Promise<SearchHit[]> {
	const words = q.toLowerCase().split(/\s+/).filter(Boolean);
	const documents = await selectDocuments(ctx.orgId);
	return documents
		.filter((doc) => !doc.restricted || ctx.roles.includes('admin'))
		.filter((doc) => {
			const text = `${doc.title} ${doc.body}`.toLowerCase();
			return words.every((word) => text.includes(word));
		})
		.map((doc) => ({ id: doc.id, title: doc.title, snippet: doc.body.slice(0, 80) }));
}
