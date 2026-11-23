import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkUpload, objectKey } from '../src/index.js';

test('objectKey puts each photo under its order', () => {
	assert.equal(objectKey('ord-1042', 3, 'beach.png'), 'orders/ord-1042/3.png');
});

test('objectKey falls back to jpg without an extension', () => {
	assert.equal(objectKey('ord-1042', 1, 'scan'), 'orders/ord-1042/1.jpg');
});

test('checkUpload accepts a photo within the limit', () => {
	assert.deepEqual(checkUpload('image/jpeg', '2048000'), { ok: true });
});

test('checkUpload refuses other types', () => {
	assert.equal(checkUpload('application/pdf', '1000').status, 415);
});

test('checkUpload refuses uploads over 50 MB', () => {
	assert.equal(checkUpload('image/tiff', String(60 * 1024 * 1024)).status, 413);
});

test('checkUpload accepts iPhone photos', () => {
	assert.deepEqual(checkUpload('image/heic', '3500000'), { ok: true });
});
