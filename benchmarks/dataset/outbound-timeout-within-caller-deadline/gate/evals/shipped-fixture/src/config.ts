/** The port the HTTP server listens on. */
export const PORT = 8080;

/** How long a request may take, in milliseconds, before the API answers 504. */
export const REQUEST_TIMEOUT_MS = 5000;

/** Base URLs of the services the quote API calls; docs/services.md describes their APIs. */
export const PRICING_URL = 'http://pricing.internal:8080';
export const TAX_URL = 'http://tax.internal:8080';
