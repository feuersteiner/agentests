import { randomUUID } from 'node:crypto';
import { boards } from '../boards/repo.ts';

// User records. Production keeps them in the Postgres table users, which the boards table
// references with ON DELETE CASCADE; this in-memory version behaves the same way and backs the
// tests and local runs.

export interface User {
	id: string;
	/** Null for an anonymous user. Unique, compared without regard to case. */
	email: string | null;
	displayName: string;
	role: 'member' | 'admin';
	/** An anonymous user signed in without an account, from the "try it first" button. */
	anonymous: boolean;
	/** Null for an anonymous user and for one provisioned through SCIM, who signs in with SSO. */
	passwordHash: string | null;
	createdAt: Date;
}

export type NewUser = Omit<User, 'id' | 'createdAt'>;

const rows = new Map<string, User>();

export const users = {
	async create(fields: NewUser): Promise<User> {
		const user: User = { id: `usr_${randomUUID()}`, createdAt: new Date(), ...fields };
		rows.set(user.id, user);
		return { ...user };
	},

	async get(id: string): Promise<User | null> {
		const user = rows.get(id);
		return user ? { ...user } : null;
	},

	async findByEmail(email: string): Promise<User | null> {
		const wanted = email.toLowerCase();
		const user = [...rows.values()].find((row) => row.email?.toLowerCase() === wanted);
		return user ? { ...user } : null;
	},

	/** Every user, oldest first. */
	async list(): Promise<User[]> {
		return [...rows.values()].map((row) => ({ ...row }));
	},

	async update(id: string, fields: Partial<NewUser>): Promise<User> {
		const user = rows.get(id);
		if (!user) throw new Error(`Unknown user ${id}`);
		Object.assign(user, fields);
		return { ...user };
	},

	/** Deletes the user and, through the cascade, their boards. */
	async delete(id: string): Promise<void> {
		if (!rows.delete(id)) throw new Error(`Unknown user ${id}`);
		await boards.deleteAllForOwner(id);
	},

	/** Empties the table; for tests. */
	reset(): void {
		rows.clear();
	}
};
