import { expect, test } from 'bun:test';
import { handle } from '../server.ts';

test('an unknown email is told there is no account', async () => {
	const response = await handle(
		new Request('http://sorrel.test/login', {
			method: 'POST',
			body: JSON.stringify({ email: 'nobody@example.com', password: 'anything' })
		})
	);
	expect(await response.json()).toEqual({ error: 'No account with that email.' });
});
