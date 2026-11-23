import { createHash } from 'node:crypto';

export const KEY_TYPES = ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'ssh-rsa'];

export interface ParsedKey {
	type: string;
	/** The base64 key blob. */
	data: string;
	comment: string;
}

/**
 * Parses one line of an OpenSSH public key file: the key type, the base64 blob and an optional
 * comment, such as "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... ana@laptop". Returns null when the
 * text is not a public key of a supported type.
 */
export function parsePublicKey(text: string): ParsedKey | null {
	const parts = text.trim().split(/\s+/);
	if (parts.length < 2 || parts.length > 3) return null;
	const [type, data, comment = ''] = parts;
	if (!KEY_TYPES.includes(type)) return null;
	if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
	// The blob starts with the key type again, as a length-prefixed string.
	const blob = Buffer.from(data, 'base64');
	if (blob.length < 4) return null;
	const typeLength = blob.readUInt32BE(0);
	if (blob.subarray(4, 4 + typeLength).toString('latin1') !== type) return null;
	return { type, data, comment };
}

/** The key's SHA256 fingerprint as `ssh-keygen -l` prints it: "SHA256:" and unpadded base64. */
export function fingerprint(data: string): string {
	const digest = createHash('sha256').update(Buffer.from(data, 'base64')).digest('base64');
	return `SHA256:${digest.replace(/=+$/, '')}`;
}
