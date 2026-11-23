import { randomUUID } from 'node:crypto';

export interface User {
	id: string;
	/** Stored trimmed and in lower case. */
	email: string;
	name: string;
	/** The argon2id hash of the password; null for an account that signs in only with Google or Okta. */
	passwordHash: string | null;
	ssoProvider: 'google' | 'okta' | null;
	/** Set by the support console when the account is closed or suspended. */
	disabled: boolean;
	createdAt: string;
}

const users = new Map<string, User>();

export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

export const findByEmail = (email: string): User | undefined => {
	const wanted = normaliseEmail(email);
	for (const user of users.values()) if (user.email === wanted) return user;
	return undefined;
};

export const findById = (id: string): User | undefined => users.get(id);

/** Adds an account, as sign-up and the identity gateway do. */
export const addUser = (input: {
	email: string;
	name: string;
	passwordHash?: string | null;
	ssoProvider?: User['ssoProvider'];
	disabled?: boolean;
}): User => {
	const user: User = {
		id: randomUUID(),
		email: normaliseEmail(input.email),
		name: input.name,
		passwordHash: input.passwordHash ?? null,
		ssoProvider: input.ssoProvider ?? null,
		disabled: input.disabled ?? false,
		createdAt: new Date().toISOString()
	};
	users.set(user.id, user);
	return user;
};

/** Marks the account disabled, as the support console does. */
export const disableUser = (id: string): void => {
	const user = users.get(id);
	if (user) user.disabled = true;
};

/** Forgets every account; for tests. */
export const clearUsers = (): void => users.clear();
