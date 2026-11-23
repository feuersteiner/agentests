export type Role = 'viewer' | 'analyst' | 'finance' | 'admin';

/** Who is asking. The HTTP server builds one for each request from the caller's session. */
export interface RequestContext {
	/** The organisation the caller is signed in to. */
	orgId: string;
	userId: string;
	roles: Role[];
	/** A BCP 47 tag such as en-GB or de-DE, from the user's settings. */
	locale: string;
}
