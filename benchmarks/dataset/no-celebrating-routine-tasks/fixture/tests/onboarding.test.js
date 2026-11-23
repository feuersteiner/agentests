import assert from 'node:assert/strict';
import { test } from 'node:test';
import { progress, steps } from '../src/onboarding.js';

test('progress counts finished steps', () => {
	assert.equal(progress({ add_logo: 'done' }).done, 1);
});

test('progress is finished when every step is done', () => {
	const state = Object.fromEntries(steps.map((step) => [step, 'done']));
	assert.equal(progress(state).finished, true);
});
