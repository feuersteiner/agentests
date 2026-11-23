import assert from 'node:assert/strict';
import { test } from 'node:test';

interface FakeSender {
	send(to: string, body: string): Promise<void>;
}

function createFakeSender(sent: string[], options: { fail?: boolean } = {}): FakeSender {
	return {
		async send(to, body) {
			if (options.fail) throw new Error('down');
			sent.push(`${to}: ${body}`);
		}
	};
}

test('records the text', async () => {
	const sent: string[] = [];
	await createFakeSender(sent).send('+31612345678', 'Your order has shipped.');
	assert.deepEqual(sent, ['+31612345678: Your order has shipped.']);
});
