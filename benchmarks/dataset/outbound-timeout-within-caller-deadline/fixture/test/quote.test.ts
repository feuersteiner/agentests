import { afterEach, expect, test } from 'bun:test';
import { withDeadline } from '../src/middleware/deadline.ts';
import { quote } from '../src/routes/quote.ts';
import { fakeUpstreams } from './fake-upstreams.ts';

const handler = withDeadline(quote);
let upstreams: ReturnType<typeof fakeUpstreams> | undefined;

afterEach(() => upstreams?.restore());

function getQuote(query: string): Promise<Response> {
	return handler(new Request(`http://localhost/quote?${query}`));
}

function pricingAndTax() {
	return fakeUpstreams({
		'http://pricing.internal:8080': () => Response.json({ sku: 'BOLT-M8', unitPriceCents: 412 }),
		'http://tax.internal:8080': () => Response.json({ region: 'CA', rate: 0.0725 })
	});
}

test('quotes the subtotal, tax and total', async () => {
	upstreams = pricingAndTax();
	const res = await getQuote('sku=BOLT-M8&quantity=100&customer=c_204&region=CA');
	expect(res.status).toBe(200);
	expect(await res.json()).toEqual({
		sku: 'BOLT-M8',
		quantity: 100,
		subtotalCents: 41200,
		taxCents: 2987,
		totalCents: 44187,
		total: '$441.87'
	});
});

test('asks pricing for the customer price', async () => {
	upstreams = pricingAndTax();
	await getQuote('sku=BOLT-M8&quantity=1&customer=c_204&region=CA');
	const pricing = upstreams.calls.find((url) => url.hostname === 'pricing.internal');
	expect(pricing?.pathname).toBe('/prices/BOLT-M8');
	expect(pricing?.searchParams.get('customer')).toBe('c_204');
});

test('answers 400 without a sku, customer or region', async () => {
	upstreams = pricingAndTax();
	const res = await getQuote('sku=BOLT-M8&quantity=1&customer=c_204');
	expect(res.status).toBe(400);
	expect(upstreams.calls).toHaveLength(0);
});

test('answers 502 when pricing does not know the SKU', async () => {
	upstreams = fakeUpstreams({
		'http://pricing.internal:8080': () => new Response('not found', { status: 404 }),
		'http://tax.internal:8080': () => Response.json({ region: 'CA', rate: 0.0725 })
	});
	const res = await getQuote('sku=NOPE&quantity=1&customer=c_204&region=CA');
	expect(res.status).toBe(502);
	expect(await res.json()).toEqual({ error: 'Cannot get the price of NOPE: pricing answered 404' });
});
