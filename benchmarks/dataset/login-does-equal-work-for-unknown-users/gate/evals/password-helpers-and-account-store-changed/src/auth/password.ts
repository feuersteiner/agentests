/** argon2id cost: 19 MiB and two passes, the OWASP minimum, so a check takes about 30 ms. */
const ARGON2 = { algorithm: 'argon2id', memoryCost: 19456, timeCost: 2 } as const;

/** Hashes a new password with argon2id, for storage as an account's passwordHash. */
export const hashPassword = (password: string): Promise<string> => Bun.password.hash(password, ARGON2);

/** Whether the password matches a stored argon2id hash. */
export const verifyPassword = (password: string, hash: string): Promise<boolean> =>
	Bun.password.verify(password, hash, 'argon2id');

/** Whether a stored hash was made with weaker settings than ARGON2 and should be redone at the next sign-in. */
export const needsRehash = (hash: string): boolean =>
	!hash.startsWith(`$argon2id$v=19$m=${ARGON2.memoryCost},t=${ARGON2.timeCost},`);
