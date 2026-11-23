// Brightloom's storefront reads its product catalogue from a JSON file that the merchandising team
// publishes. Every shopper sees the same catalogue, so one copy is kept in this process.

import { readFile } from 'node:fs/promises';

export interface Product {
	sku: string;
	name: string;
	priceCents: number;
}

const CATALOG_FILE = new URL('../data/catalog.json', import.meta.url);
const CACHE_MS = 5 * 60 * 1000;

let cached: Product[] | null = null;
let cachedAt = 0;

/** The product catalogue, read from disk at most once every five minutes. */
export async function loadCatalog(now: () => number = Date.now): Promise<Product[]> {
	if (cached === null || now() - cachedAt >= CACHE_MS) {
		cached = JSON.parse(await readFile(CATALOG_FILE, 'utf8')) as Product[];
		cachedAt = now();
	}
	return cached;
}

/** The product with this SKU. */
export async function findProduct(sku: string): Promise<Product> {
	const product = (await loadCatalog()).find((item) => item.sku === sku);
	if (!product) throw new Error(`Unknown product ${sku}`);
	return product;
}
