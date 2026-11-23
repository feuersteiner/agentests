/** The client for the Fernhill partner API. Every request the console makes goes through here. */

export interface Account {
  id: string;
  name: string;
}

export interface Me {
  email: string;
  accounts: Account[];
}

export type OrganizationStatus = 'active' | 'trial' | 'suspended';
export type Plan = 'starter' | 'growth' | 'enterprise';

export interface Organization {
  id: string;
  name: string;
  status: OrganizationStatus;
  plan: Plan;
  seats: number;
  createdAt: string;
}

/** The filters GET /organizations understands. A filter that is left out matches everything. */
export interface OrganizationFilters {
  status?: OrganizationStatus;
  plan?: Plan;
  /** Part of the organization's name, matched without regard to case. */
  search?: string;
}

export type Role = 'owner' | 'admin' | 'member';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  lastActiveAt: string | null;
}

export interface MemberQuery {
  role?: Role;
  sort?: 'name' | 'lastActive';
}

export type UsagePeriod = 'month' | 'year';

/** Seats in use on one day. */
export interface UsageRow {
  date: string;
  seats: number;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const baseUrl = '/api/v2';

/** The URL of an API path with its query parameters; parameters that are undefined are left out. */
export function buildUrl(path: string, params: Record<string, string | undefined> = {}): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) query.set(name, value);
  }
  const search = query.toString();
  return search ? `${baseUrl}${path}?${search}` : `${baseUrl}${path}`;
}

async function get<T>(path: string, params?: Record<string, string | undefined>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(buildUrl(path, params), { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) throw new ApiError(response.status, `Request failed (${response.status})`);
  return (await response.json()) as T;
}

/** Calls `load` again after a failure, up to `attempts` times in all, waiting longer each time. */
async function withRetry<T>(load: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await load();
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
    }
  }
}

export function fetchMe(): Promise<Me> {
  return get<Me>('/me');
}

export function fetchOrganizations(
  accountId: string,
  filters: OrganizationFilters,
  signal?: AbortSignal
): Promise<Organization[]> {
  return withRetry(() => get<Organization[]>('/organizations', { account: accountId, ...filters }, signal));
}

export function fetchMembers(accountId: string, query: MemberQuery, signal?: AbortSignal): Promise<Member[]> {
  return get<Member[]>('/members', { account: accountId, ...query }, signal);
}

export function fetchUsage(accountId: string, period: UsagePeriod, signal?: AbortSignal): Promise<UsageRow[]> {
  return get<UsageRow[]>('/usage', { account: accountId, period }, signal);
}

/** A sentence for the partner about a failed request. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Check your connection and try again.';
}
