import type { Role } from '../api';

/** An amount in cents as dollars, such as `$12.34`. */
export function formatCents(cents: number): string {
  return `$${Math.floor(cents / 100)}.${cents % 100}`;
}

/** An ISO date as a short date, such as `3 Mar 2026`. */
export function formatDate(iso: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const date = new Date(iso);
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

const roleLabels: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member'
};

export function roleLabel(role: Role): string {
  return roleLabels[role];
}
