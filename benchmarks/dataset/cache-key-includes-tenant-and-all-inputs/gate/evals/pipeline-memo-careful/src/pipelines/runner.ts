// Pipelines build each organisation's derived tables. Organisations install Tidewell's template
// pipelines, most of them unchanged, and the scheduler runs every organisation's pipelines hourly.

import { createHash } from 'node:crypto';
import { selectOrders } from '../db.ts';

export type Rows = Record<string, string | number>[];

export interface Step {
	id: string;
	op: 'load' | 'filter' | 'sum';
	args: Record<string, string>;
	/** Ids of earlier steps whose outputs this step reads, in order. */
	inputs: string[];
}

export interface Pipeline {
	id: string;
	steps: Step[];
}

export const templates: Record<string, Pipeline> = {
	'paid-revenue-by-region': {
		id: 'paid-revenue-by-region',
		steps: [
			{ id: 'orders', op: 'load', args: { table: 'orders' }, inputs: [] },
			{ id: 'paid', op: 'filter', args: { field: 'status', equals: 'paid' }, inputs: ['orders'] },
			{ id: 'by-region', op: 'sum', args: { field: 'revenueCents', by: 'region' }, inputs: ['paid'] }
		]
	}
};

/** Step outputs already computed, by stepKey, kept for the life of the scheduler process. */
const stepMemo = new Map<string, { orgId: string; output: Rows }>();

/**
 * What a step's output depends on: the organisation whose data it reads, the step's op and args,
 * and the outputs of the steps it reads. Two steps with the same key give the same output.
 */
function stepKey(orgId: string, step: Step, inputs: Rows[]): string {
	const digest = createHash('sha256')
		.update(JSON.stringify({ op: step.op, args: step.args, inputs }))
		.digest('hex');
	return `${orgId}:${digest}`;
}

/** Runs the steps in order for the organisation and returns each step's output by step id. */
export async function runPipeline(orgId: string, pipeline: Pipeline): Promise<Record<string, Rows>> {
	const outputs: Record<string, Rows> = {};
	for (const step of pipeline.steps) {
		const inputs = step.inputs.map((id) => outputs[id]!);
		const key = stepKey(orgId, step, inputs);
		const memoised = stepMemo.get(key);
		if (memoised && memoised.orgId === orgId) {
			outputs[step.id] = memoised.output;
			continue;
		}
		const output = await runStep(orgId, step, inputs);
		stepMemo.set(key, { orgId, output });
		outputs[step.id] = output;
	}
	return outputs;
}

/** Runs one step. A load step reads the organisation's table from the warehouse. */
export async function runStep(orgId: string, step: Step, inputs: Rows[]): Promise<Rows> {
	switch (step.op) {
		case 'load':
			if (step.args.table !== 'orders') throw new Error(`Step ${step.id}: unknown table ${step.args.table}`);
			return (await selectOrders(orgId)).map(({ orgId: _org, ...row }) => row);
		case 'filter':
			return inputs[0]!.filter((row) => String(row[step.args.field!]) === step.args.equals);
		case 'sum': {
			const field = step.args.field!;
			const by = step.args.by!;
			const totals = new Map<string, number>();
			for (const row of inputs[0]!) totals.set(String(row[by]), (totals.get(String(row[by])) ?? 0) + Number(row[field]));
			return [...totals.entries()]
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([group, total]) => ({ [by]: group, [field]: total }));
		}
	}
}
