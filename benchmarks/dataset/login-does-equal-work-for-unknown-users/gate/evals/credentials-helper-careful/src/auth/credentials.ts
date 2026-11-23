import { hashPassword, verifyPassword } from './password.ts';
import { findByEmail, type User } from '../db/users.ts';

const DUMMY_HASH = await hashPassword(crypto.randomUUID());

/**
 * The account these credentials sign in to, or null. Every call runs one argon2id check, and every
 * refusal is the same null, so callers answer every failure alike.
 */
export const checkCredentials = async (email: string, password: string): Promise<User | null> => {
	const user = findByEmail(email);
	const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
	if (!user || !user.passwordHash || user.disabled || !valid) return null;
	return user;
};
