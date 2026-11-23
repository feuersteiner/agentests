import type { OrganizationStatus, Plan, Role } from '../api/client';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** An ISO date as a short date, such as `3 Mar 2026`. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** An ISO date as a month, such as `Mar 2026`. */
export function formatMonth(iso: string): string {
  const date = new Date(iso);
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** When a member last signed in, as a short date. */
export function formatLastActive(iso: string | null): string {
  if (iso === null) return formatDate('');
  return formatDate(iso);
}

/** A number of seats, such as `12 seats`. */
export function formatSeats(seats: number): string {
  return `${seats} seats`;
}

const planLabels: Record<Plan, string> = {
  starter: 'Starter',
  growth: 'Growth',
  enterprise: 'Enterprise'
};

export function planLabel(plan: Plan): string {
  return planLabels[plan];
}

const statusLabels: Record<OrganizationStatus, string> = {
  active: 'Active',
  trial: 'Trial',
  suspended: 'suspended'
};

export function statusLabel(status: OrganizationStatus): string {
  return statusLabels[status];
}

const roleLabels: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member'
};

export function roleLabel(role: Role): string {
  return roleLabels[role];
}
