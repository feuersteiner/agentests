import { verifyPassword } from './password.ts';
import type { User } from '../db/users.ts';

/** Whether the password is the account's own. */
export const checkPassword = async (user: User, password: string): Promise<boolean> =>
	user.passwordHash !== null && (await verifyPassword(password, user.passwordHash));
