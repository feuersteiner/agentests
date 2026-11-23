import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectCarrier, normalise } from '../src/tracking.js';

test('normalise trims and upper-cases', () => {
	assert.equal(normalise('  3sabcd123456789 '), '3SABCD123456789');
});

test('detectCarrier recognises PostNL, DHL and UPS', () => {
	assert.equal(detectCarrier('3SABCD123456789'), 'postnl');
	assert.equal(detectCarrier('JD0146000022334455'), 'dhl');
	assert.equal(detectCarrier('1Z999AA10123456784'), 'ups');
});

test('detectCarrier returns null for an unknown format', () => {
	assert.equal(detectCarrier('HELLO'), null);
});
