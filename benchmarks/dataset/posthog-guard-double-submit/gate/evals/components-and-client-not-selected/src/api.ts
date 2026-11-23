/** The client for the Harbor API. Every request the console makes goes through `api`. */

export interface Project {
  id: string;
  name: string;
  notificationEmail: string;
}

export interface Invoice {
  id: string;
  issuedAt: string;
  amountCents: number;
  url: string;
}

export interface Billing {
  plan: string;
  priceCents: number;
  coupon: string | null;
  invoices: Invoice[];
}

export type Role = 'owner' | 'admin' | 'member';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
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

const baseUrl = '/api/v1';

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) throw new ApiError(response.status, `Request failed (${response.status})`);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  getProject: () => request<Project>('GET', '/project'),
  /** Sends a test message to the project's notification email. */
  sendTestEmail: () => request<{ sentTo: string }>('POST', '/project/test-email'),
  /** Deletes the project and everything in it. There is no undo. */
  deleteProject: () => request<void>('DELETE', '/project'),

  getBilling: () => request<Billing>('GET', '/billing'),
  /** Applies a coupon to the subscription; rejects with a 422 when the code is unknown or expired. */
  applyCoupon: (code: string) => request<Billing>('POST', '/billing/coupon', { code }),

  getMembers: () => request<Member[]>('GET', '/members'),
  /** Emails an invitation; rejects with a 409 when the address is already a member. */
  inviteMember: (email: string) => request<{ email: string }>('POST', '/members/invitations', { email })
};

/** A sentence for the user about a failed request. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Check your connection and try again.';
}
