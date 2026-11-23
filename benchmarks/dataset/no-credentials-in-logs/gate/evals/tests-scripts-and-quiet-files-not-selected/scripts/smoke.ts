// Calls the reports API directly with sluice's key, to tell a sluice problem from a reports API problem.
const url = new URL('/reports/daily', process.env.UPSTREAM_URL);
const key = process.env.UPSTREAM_TOKEN ?? '';
console.log(`GET ${url.href} with key ${key}`);
const response = await fetch(url, { headers: { 'x-api-key': key } });
console.log(response.status, await response.text());
