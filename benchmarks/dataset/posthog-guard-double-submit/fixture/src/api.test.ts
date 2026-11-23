import { afterEach, expect, test } from 'bun:test';
import { ApiError, api, describeError } from './api';

const realFetch = globalThis.fetch;

function stubFetch(status: number, body?: unknown) {
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  }) as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('a GET returns the parsed body', async () => {
  const calls = stubFetch(200, { id: 'prj_1', name: 'Lighthouse', notificationEmail: 'ops@example.com' });
  const project = await api.getProject();
  expect(project.name).toBe('Lighthouse');
  expect(calls[0]?.url).toBe('/api/v1/project');
  expect(calls[0]?.init?.method).toBe('GET');
});

test('a POST sends its body as JSON', async () => {
  const calls = stubFetch(200, { email: 'ana@example.com' });
  await api.inviteMember('ana@example.com');
  expect(calls[0]?.init?.body).toBe('{"email":"ana@example.com"}');
});

test('a 204 resolves with nothing', async () => {
  stubFetch(204);
  expect(await api.deleteProject()).toBeUndefined();
});

test('a failed request rejects with an ApiError that carries the status', async () => {
  stubFetch(503, { message: 'Harbor is down for maintenance.' });
  const error = await api.getBilling().catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(503);
});

test('describeError falls back to a general sentence', () => {
  expect(describeError(new TypeError('Failed to fetch'))).toContain('Something went wrong');
});
