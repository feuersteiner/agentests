import { expect, test } from 'bun:test';

test('a Headers object serialises with its values', () => {
	const headers = new Headers({ authorization: 'Bearer test-user-token', cookie: 'session=test' });
	console.log(JSON.stringify(headers));
	expect(JSON.parse(JSON.stringify(headers))).toEqual({ authorization: 'Bearer test-user-token', cookie: 'session=test' });
});
