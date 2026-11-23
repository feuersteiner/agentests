import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { emailFor, emails } from '../src/emails.js';

test('every registered email has its template', () => {
	for (const email of emails) assert.equal(existsSync(email.template), true, email.template);
});

test('emailFor finds the email of an event', () => {
	assert.equal(emailFor('invoice.sent')?.id, 'invoice-sent');
});
