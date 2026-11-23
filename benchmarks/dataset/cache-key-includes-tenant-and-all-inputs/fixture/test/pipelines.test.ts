import { describe, expect, test } from 'bun:test';
import { runPipeline, templates, type Pipeline } from '../src/pipelines/runner.ts';

const template = templates['paid-revenue-by-region']!;

describe('runPipeline', () => {
	test("sums an organisation's paid revenue by region", async () => {
		const outputs = await runPipeline('org_lumen', template);
		expect(outputs['by-region']).toEqual([
			{ region: 'north', revenueCents: 125000 },
			{ region: 'south', revenueCents: 319900 }
		]);
	});

	test('runs the same template on each organisation’s own orders', async () => {
		const outputs = await runPipeline('org_brook', template);
		expect(outputs['by-region']).toEqual([
			{ region: 'north', revenueCents: 132000 },
			{ region: 'south', revenueCents: 31000 }
		]);
	});

	test('returns every step’s output', async () => {
		const pipeline: Pipeline = {
			id: 'refunds',
			steps: [
				{ id: 'orders', op: 'load', args: { table: 'orders' }, inputs: [] },
				{ id: 'refunded', op: 'filter', args: { field: 'status', equals: 'refunded' }, inputs: ['orders'] }
			]
		};
		const outputs = await runPipeline('org_lumen', pipeline);
		expect(outputs.orders).toHaveLength(4);
		expect(outputs.refunded!.map((row) => row.orderId)).toEqual(['L-1003']);
	});

	test('rejects an unknown table', async () => {
		const pipeline: Pipeline = {
			id: 'bad',
			steps: [{ id: 'x', op: 'load', args: { table: 'invoices' }, inputs: [] }]
		};
		await expect(runPipeline('org_lumen', pipeline)).rejects.toThrow('Step x: unknown table invoices');
	});
});
