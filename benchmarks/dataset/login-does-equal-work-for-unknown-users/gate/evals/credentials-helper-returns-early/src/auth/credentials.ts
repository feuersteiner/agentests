import { verifyPassword } from './password.ts';
import { findByEmail, type User } from '../db/users.ts';

/** The account these credentials sign in to, or null. */
export const checkCredentials = async (email: string, password: string): Promise<User | null> => {
	const user = findByEmail(email);
	if (!user?.passwordHash || user.disabled) return null;
	return (await verifyPassword(password, user.passwordHash)) ? user : null;
};
