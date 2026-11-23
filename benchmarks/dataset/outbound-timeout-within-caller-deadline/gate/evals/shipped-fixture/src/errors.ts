/** A service the quote API depends on answered with an error status. */
export class UpstreamError extends Error {
	constructor(
		readonly service: string,
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'UpstreamError';
	}
}
