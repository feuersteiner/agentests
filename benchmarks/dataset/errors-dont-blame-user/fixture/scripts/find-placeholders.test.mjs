import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findPlaceholders, flatten } from './find-placeholders.mjs';

test('finds a placeholder', () => {
	assert.deepEqual(findPlaceholders('Hi {{first_name}},'), ['first_name']);
});

test('lists a repeated placeholder once', () => {
	assert.deepEqual(findPlaceholders('{{total}} of {{total}}'), ['total']);
});

test('flattens nested strings to dotted keys', () => {
	assert.deepEqual(flatten({ nav: { payroll: 'Payroll' }, title: 'Home' }), [
		['nav.payroll', 'Payroll'],
		['title', 'Home']
	]);
});
