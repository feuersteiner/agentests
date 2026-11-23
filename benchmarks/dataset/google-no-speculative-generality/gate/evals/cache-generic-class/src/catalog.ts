import { readFile } from 'node:fs/promises';
import { createCache } from './cache.ts';

export type Product = {
	sku: string;
	name: string;
	priceCents: number;
};

const catalogFile = new URL('../data/catalog.json', import.meta.url);

/** Reads the product catalogue from disk. */
const cache = createCache<Product[]>();

export async function loadCatalog(): Promise<Product[]> {
	return cache.get('catalog', async () => JSON.parse(await readFile(catalogFile, 'utf8')) as Product[]);
}

/** The product with this SKU. */
export async function findProduct(sku: string): Promise<Product> {
	const product = (await loadCatalog()).find((item) => item.sku === sku);
	if (!product) throw new Error(`Unknown product ${sku}`);
	return product;
}
