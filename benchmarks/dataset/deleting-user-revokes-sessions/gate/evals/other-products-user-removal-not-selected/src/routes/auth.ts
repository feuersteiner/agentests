import { verifyPassword } from '../auth/password.ts';
import { db } from '../db/users.ts';
import { json, type ApiRequest, type ApiResponse } from '../http.ts';

// Pinecrest Ledger: sign-in for the bookkeeping app.

const MAX_FAILED_ATTEMPTS = 5;
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG';

/** POST /login: signs in with an email and password; five wrong passwords in a row disable the account. */
export async function login(req: ApiRequest): Promise<ApiResponse> {
	const { email, password } = req.body as { email?: string; password?: string };
	const user = typeof email === 'string' ? await db.users.findByEmail(email) : null;
	const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, String(password ?? ''));
	if (!user || !user.passwordHash || user.disabled || !ok) {
		if (user && !ok) {
			const failedAttempts = user.failedAttempts + 1;
			await db.users.update(user.id, {
				failedAttempts,
				disabled: failedAttempts >= MAX_FAILED_ATTEMPTS
			});
		}
		return json(401, { error: 'Invalid email or password' });
	}
	await db.users.update(user.id, { failedAttempts: 0 });
	return json(200, { token: await db.tokens.issue(user.id) });
}
