import type { RequestContext } from '../context.ts';
import { selectDocuments } from '../db.ts';

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
