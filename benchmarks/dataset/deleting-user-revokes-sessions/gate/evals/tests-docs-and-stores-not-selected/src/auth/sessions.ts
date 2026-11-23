import { randomBytes } from 'node:crypto';
import { redis } from '../redis.ts';
import type { User } from '../users/repo.ts';

// Sign-in sessions, kept in Redis. Each session is a JSON value under session:<token> that holds
// a copy of the user, so that requireUser can authenticate a request without reading the users
// table. Each user's tokens are also listed in the set user-sessions:<userId>.

/** The user as a session remembers it. */
export interface AuthUser {
	id: string;
	email: string | null;
	displayName: string;
	role: 'member' | 'admin';
	anonymous: boolean;
}

export interface Session {
	token: string;
	user: AuthUser;
	createdAt: string;
}

/** A session lasts seven days from sign-in. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const sessionKey = (token: string) => `session:${token}`;
const userSessionsKey = (userId: string) => `user-sessions:${userId}`;

export const toAuthUser = ({ id, email, displayName, role, anonymous }: User): AuthUser => ({
	id,
	email,
	displayName,
	role,
	anonymous
});

export const sessions = {
	/** Starts a session for the user and returns it, with its new token. */
	async create(user: AuthUser): Promise<Session> {
		const session: Session = {
			token: randomBytes(24).toString('base64url'),
			user,
			createdAt: new Date().toISOString()
		};
		await redis().set(sessionKey(session.token), JSON.stringify(session), 'EX', SESSION_TTL_SECONDS);
		await redis().sadd(userSessionsKey(user.id), session.token);
		await redis().expire(userSessionsKey(user.id), SESSION_TTL_SECONDS);
		return session;
	},

	/** The session for a token, or null when it does not exist or has expired. */
	async get(token: string): Promise<Session | null> {
		const raw = await redis().get(sessionKey(token));
		return raw === null ? null : (JSON.parse(raw) as Session);
	},

	/** The tokens of the user's sessions. */
	async listForUser(userId: string): Promise<string[]> {
		return redis().smembers(userSessionsKey(userId));
	},

	/** Ends one session, as signing out does. */
	async revoke(token: string): Promise<void> {
		const session = await this.get(token);
		await redis().del(sessionKey(token));
		if (session) await redis().srem(userSessionsKey(session.user.id), token);
	},

	/** Ends every session of the user and returns how many there were. */
	async revokeAllForUser(userId: string): Promise<number> {
		const tokens = await this.listForUser(userId);
		if (tokens.length > 0) await redis().del(...tokens.map(sessionKey));
		await redis().del(userSessionsKey(userId));
		return tokens.length;
	}
};
