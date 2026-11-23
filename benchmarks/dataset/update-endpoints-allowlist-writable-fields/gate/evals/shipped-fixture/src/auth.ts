import { db } from './db.ts';
import type { User } from './models.ts';

/** The user whose session token is in the Authorization header, or null. */
export async function authenticate(request: Request): Promise<User | null> {
	const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
	if (!token) return null;
	const session = await db.session.findUnique({ where: { id: token } });
	if (!session) return null;
	return db.user.findUnique({ where: { id: session.userId } });
}
