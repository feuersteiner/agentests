/** Headers whose values would let a reader act as the caller or as sluice. */
const SECRET_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key']);

/** The headers as a plain object for a log line, with every secret header's value replaced. */
export function redactHeaders(headers: Headers): Record<string, string> {
	return Object.fromEntries(
		[...headers].map(([name, value]) => [name, SECRET_HEADERS.has(name) ? '[redacted]' : value])
	);
}
