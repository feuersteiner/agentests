import type { User } from './models.ts';

/** What a route handler gets: the signed-in user, the path parameters, the query and the JSON body. */
export interface ApiRequest {
	user: User;
	params: Record<string, string>;
	query: URLSearchParams;
	body: any;
}

export interface ApiResponse {
	status: number;
	body?: unknown;
}

export type Handler = (req: ApiRequest) => ApiResponse | Promise<ApiResponse>;

export function json(status: number, body?: unknown): ApiResponse {
	return { status, body };
}
