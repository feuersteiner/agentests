import { afterEach, expect, test } from 'bun:test';
import { ApiError, buildUrl, describeError, fetchOrganizations } from './client';

const realFetch = globalThis.fetch;

function stubFetch(status: number, body?: unknown) {
  const urls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    urls.push(url);
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  }) as typeof fetch;
  return urls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('buildUrl adds the query parameters', () => {
  expect(buildUrl('/usage', { account: 'acc_1', period: 'month' })).toBe('/api/v2/usage?account=acc_1&period=month');
});

test('buildUrl leaves out undefined parameters', () => {
  expect(buildUrl('/members', { account: 'acc_1', role: undefined })).toBe('/api/v2/members?account=acc_1');
  expect(buildUrl('/me')).toBe('/api/v2/me');
});

test('fetchOrganizations sends the account and the filters', async () => {
  const urls = stubFetch(200, []);
  await fetchOrganizations('acc_1', { status: 'trial', plan: 'growth' });
  expect(urls[0]).toBe('/api/v2/organizations?account=acc_1&status=trial&plan=growth');
});

test('a failed request rejects with an ApiError that carries the status', async () => {
  stubFetch(503, { message: 'The partner API is down for maintenance.' });
  const error = await fetchOrganizations('acc_1', {}).catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(503);
});

test('describeError falls back to a general sentence', () => {
  expect(describeError(new TypeError('Failed to fetch'))).toContain('Something went wrong');
});
