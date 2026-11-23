import { expect, test } from 'bun:test';
import { fingerprint, parsePublicKey } from '../src/keys/parse.ts';
import { NEW_KEY, NEW_KEY_FINGERPRINT } from './helpers.ts';

const DATA = NEW_KEY.split(' ')[1];

test('parses a key without a comment', () => {
	expect(parsePublicKey(NEW_KEY)).toEqual({ type: 'ssh-ed25519', data: DATA, comment: '' });
});

test('parses a key with a comment', () => {
	expect(parsePublicKey(`${NEW_KEY} ben@laptop`)).toEqual({ type: 'ssh-ed25519', data: DATA, comment: 'ben@laptop' });
});

test('rejects an unsupported key type', () => {
	expect(parsePublicKey(`ssh-dss ${DATA}`)).toBeNull();
});

test('rejects a blob of another key type', () => {
	expect(parsePublicKey(`ssh-rsa ${DATA}`)).toBeNull();
});

test('fingerprints the blob as ssh-keygen does', () => {
	expect(fingerprint(DATA)).toBe(NEW_KEY_FINGERPRINT);
});
