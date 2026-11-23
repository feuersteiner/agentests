import { describe, expect, test } from 'bun:test';
import type { RequestContext } from '../src/context.ts';
import { formatMoney, maskEmail } from '../src/reports/queries.ts';
import { runReport, UnknownReportError } from '../src/reports/service.ts';

const analyst: RequestContext = { orgId: 'org_lumen', userId: 'u-anna', roles: ['analyst'], locale: 'en-GB' };
const finance: RequestContext = { orgId: 'org_lumen', userId: 'u-felix', roles: ['finance'], locale: 'en-GB' };
const admin: RequestContext = { orgId: 'org_lumen', userId: 'u-greta', roles: ['admin'], locale: 'de-DE' };

describe('runReport', () => {
	test("returns only the caller's organisation's orders", async () => {
		const result = await runReport(analyst, 'orders', {});
		expect(result.rows.map((row) => row[0])).toEqual(['L-1001', 'L-1002', 'L-1003', 'L-1004']);
	});

	test('filters by region and from date', async () => {
		const result = await runReport(analyst, 'orders', { from: '2026-03-10', region: 'south' });
		expect(result.rows.map((row) => row[0])).toEqual(['L-1002', 'L-1004']);
	});

	test('hides the margin column from analysts but not from finance', async () => {
		expect((await runReport(analyst, 'revenue-by-region', {})).columns).toEqual(['region', 'orders', 'revenue']);
		expect((await runReport(finance, 'revenue-by-region', {})).columns).toEqual([
			'region',
			'orders',
			'revenue',
			'margin'
		]);
	});

	test('masks customer emails for everyone but admins', async () => {
		const forAnalyst = await runReport(analyst, 'orders', { region: 'north' });
		const forAdmin = await runReport(admin, 'orders', { region: 'north' });
		expect(forAnalyst.rows[0]![3]).toBe('j***@kranich.example');
		expect(forAdmin.rows[0]![3]).toBe('jonas@kranich.example');
	});

	test("formats money and dates in the caller's locale", async () => {
		const result = await runReport(admin, 'orders', { region: 'north' });
		expect(result.rows[0]![1]).toBe('02.03.2026');
		expect(result.rows[0]![5]).toBe(formatMoney(125000, 'EUR', 'de-DE'));
		expect(result.rows[0]![5]).toContain('1.250,00');
	});

	test('sums paid revenue by region', async () => {
		const result = await runReport(finance, 'revenue-by-region', {});
		expect(result.rows).toEqual([
			['north', '1', '€1,250.00', '€410.00'],
			['south', '2', '€3,199.00', '€930.00']
		]);
	});

	test('rejects an unknown report', async () => {
		await expect(runReport(analyst, 'churn', {})).rejects.toBeInstanceOf(UnknownReportError);
	});
});

describe('maskEmail', () => {
	test('keeps the first letter and the domain', () => {
		expect(maskEmail('mia@feldweg.example')).toBe('m***@feldweg.example');
	});
});
