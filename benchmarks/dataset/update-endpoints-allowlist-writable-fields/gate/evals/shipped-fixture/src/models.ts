export type Role = 'member' | 'admin';

export interface Org {
	id: string;
	name: string;
	createdAt: string;
}

export interface User {
	id: string;
	orgId: string;
	email: string;
	displayName: string;
	bio: string;
	role: Role;
	createdAt: string;
}

/** An SSH public key a user pushes and pulls with. */
export interface PublicKey {
	id: string;
	userId: string;
	title: string;
	/** The key's type and base64 data, as in "ssh-ed25519 AAAAC3Nz...", without the comment. */
	key: string;
	fingerprint: string;
	createdAt: string;
}

export interface Project {
	id: string;
	orgId: string;
	ownerId: string;
	name: string;
	slug: string;
	description: string;
	createdAt: string;
}

/** A signed-in session; its id is the bearer token. */
export interface Session {
	id: string;
	userId: string;
	createdAt: string;
}
