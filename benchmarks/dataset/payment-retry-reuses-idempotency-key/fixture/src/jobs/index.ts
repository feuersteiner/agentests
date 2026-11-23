import { formatAmount } from '../money.ts';
import type { PaymentRepo } from '../payments/repo.ts';
import type { PaymentService } from '../payments/service.ts';
import { settlementReport } from './settlement.ts';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export interface Job {
	name: string;
	everyMs: number;
	run: () => Promise<void>;
}

export interface JobDeps {
	repo: PaymentRepo;
	service: PaymentService;
	log: (line: string) => void;
}

/** The background jobs the worker process runs. */
export function paymentJobs({ repo, log }: JobDeps): Job[] {
	return [
		{
			name: 'settlement-report',
			everyMs: DAY,
			run: async () => {
				const day = new Date(Date.now() - DAY).toISOString().slice(0, 10);
				for (const line of settlementReport(repo, day)) {
					const total = formatAmount(line.total, line.currency);
					log(`settlement ${day} ${line.currency}: ${line.count} captures, ${total}`);
				}
			}
		}
	];
}

/** Runs each job every `everyMs` milliseconds until the returned function is called. */
export function startJobs(jobs: Job[], log: (line: string) => void): () => void {
	const timers = jobs.map((job) =>
		setInterval(() => {
			job.run().catch((error) => log(`job ${job.name} failed: ${String(error)}`));
		}, job.everyMs)
	);
	return () => timers.forEach((timer) => clearInterval(timer));
}
