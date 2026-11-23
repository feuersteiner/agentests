import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseClients } from '../src/parseClients.js';

test('parseClients reads name and email', () => {
	const { clients } = parseClients('name,email\nAda Bloem,ada@bloem.example\n');
	assert.deepEqual(clients, [{ name: 'Ada Bloem', email: 'ada@bloem.example' }]);
});

test('parseClients counts rows without an email as skipped', () => {
	const { clients, skipped } = parseClients('name,email\nAda Bloem,ada@bloem.example\nNo Mail,\n');
	assert.equal(clients.length, 1);
	assert.equal(skipped, 1);
});
