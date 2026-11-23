import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findPlaceholders } from './placeholders.mjs';

test('lists each placeholder once, in order', () => {
	const text = 'Hi {{first_name}}, your run for {{pay_date}} is ready. {{first_name}}';
	assert.deepEqual(findPlaceholders(text), ['first_name', 'pay_date']);
});
