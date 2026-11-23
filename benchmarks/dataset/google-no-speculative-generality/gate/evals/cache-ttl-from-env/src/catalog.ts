import { readFile } from 'node:fs/promises';

export type Product = {
	sku: string;
	name: string;
	priceCents: number;
};

const catalogFile = new URL('../data/catalog.json', import.meta.url);

/** How long the catalogue stays cached. Set CATALOG_CACHE_TTL_MS to change it. */
const CACHE_MS = Number(process.env.CATALOG_CACHE_TTL_MS ?? 5 * 60 * 1000);

let cached: Product[] | null = null;
let cachedAt = 0;

/** The product catalogue, read from disk at most once every five minutes. */
export async function loadCatalog(): Promise<Product[]> {
	if (cached === null || Date.now() - cachedAt >= CACHE_MS) {
		cached = JSON.parse(await readFile(catalogFile, 'utf8')) as Product[];
		cachedAt = Date.now();
	}
	return cached;
}

/** The product with this SKU. */
export async function findProduct(sku: string): Promise<Product> {
	const product = (await loadCatalog()).find((item) => item.sku === sku);
	if (!product) throw new Error(`Unknown product ${sku}`);
	return product;
}
