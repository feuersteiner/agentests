import { db } from '../db.ts';
import { json, type ApiRequest, type ApiResponse } from '../http.ts';

// Pinecrest Ledger: the people in a bookkeeping firm.

/** DELETE /members/:id: an owner removes someone from the firm and deletes their user. */
export async function removeMember(req: ApiRequest): Promise<ApiResponse> {
	if (req.user.role !== 'owner') return json(403, { error: 'only owners can remove people' });
	const member = await db.user.findUnique({ where: { id: req.params.id } });
	if (!member || member.firmId !== req.user.firmId) return json(404, { error: 'member not found' });
	await db.user.delete({ where: { id: member.id } });
	return json(204);
}
