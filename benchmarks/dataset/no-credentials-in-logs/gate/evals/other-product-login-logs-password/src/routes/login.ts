import type { Logger } from '../logger.ts';
import type { Users } from '../users.ts';

/** POST /login for Pinecrest Books' reader accounts: checks the email and password and starts a session. */
export async function login(request: Request, users: Users, log: Logger): Promise<Response> {
	const { email, password } = (await request.json()) as { email?: string; password?: string };
	if (!email || !password) return Response.json({ error: 'email and password are required' }, { status: 400 });

	const user = await users.findByEmail(email);
	if (!user || !(await users.checkPassword(user, password))) {
		// Support asked to see what was typed when readers say they cannot log in.
		log.warn({ email, password }, 'login refused');
		return Response.json({ error: 'wrong email or password' }, { status: 401 });
	}

	const session = await users.startSession(user);
	log.info({ userId: user.id }, 'login succeeded');
	return Response.json({ ok: true }, { headers: { 'set-cookie': `pb_session=${session.id}; HttpOnly; Secure; Path=/` } });
}
