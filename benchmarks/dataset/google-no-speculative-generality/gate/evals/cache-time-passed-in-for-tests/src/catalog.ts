import { readFile } from 'node:fs/promises';

export type Product = {
	sku: string;
	name: string;
	priceCents: number;
};

const catalogFile = new URL('../data/catalog.json', import.meta.url);

const CACHE_MS = 5 * 60 * 1000;

let cached: Product[] | null = null;
let cachedAt = 0;

/**
 * The product catalogue, read from disk at most once every five minutes.
 * The tests pass `now` to move the clock; everything else leaves it out.
 */
export async function loadCatalog(now: number = Date.now()): Promise<Product[]> {
	if (cached === null || now - cachedAt >= CACHE_MS) {
		cached = JSON.parse(await readFile(catalogFile, 'utf8')) as Product[];
		cachedAt = now;
	}
	return cached;
}

/** The product with this SKU. */
export async function findProduct(sku: string): Promise<Product> {
	const product = (await loadCatalog()).find((item) => item.sku === sku);
	if (!product) throw new Error(`Unknown product ${sku}`);
	return product;
}
