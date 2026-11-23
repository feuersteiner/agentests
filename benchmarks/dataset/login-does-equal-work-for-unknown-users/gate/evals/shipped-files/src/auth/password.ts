/** Hashes a new password with argon2id, for storage as an account's passwordHash. */
export const hashPassword = (password: string): Promise<string> =>
	Bun.password.hash(password, { algorithm: 'argon2id' });

/** Whether the password matches a stored argon2id hash. */
export const verifyPassword = (password: string, hash: string): Promise<boolean> =>
	Bun.password.verify(password, hash, 'argon2id');
