import { randomBytes } from 'node:crypto';

/** The web app's session cookie. */
export const SESSION_COOKIE = 'sorrel_session';

/** How long a session lasts. */
export const SESSION_DAYS = 30;

export type Client = 'web' | 'mobile';

export interface Session {
	token: string;
	userId: string;
	client: Client;
	/** When the session stops working, in milliseconds since the epoch. */
	expiresAt: number;
}

const sessions = new Map<string, Session>();

/** Starts a session for the account. */
export const createSession = (userId: string, client: Client): Session => {
	const session: Session = {
		token: randomBytes(32).toString('base64url'),
		userId,
		client,
		expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60
	};
	sessions.set(session.token, session);
	return session;
};

/** The live session with this token, or undefined when there is none or it has expired. */
export const findSession = (token: string): Session | undefined => {
	const session = sessions.get(token);
	if (!session) return undefined;
	if (session.expiresAt <= Date.now()) {
		sessions.delete(token);
		return undefined;
	}
	return session;
};

/** Ends one session. */
export const revokeSession = (token: string): void => {
	sessions.delete(token);
};

/** Ends every session of the account. */
export const revokeSessions = (userId: string): void => {
	for (const [token, session] of sessions) if (session.userId === userId) sessions.delete(token);
};

/** Forgets every session; for tests. */
export const clearSessions = (): void => sessions.clear();
