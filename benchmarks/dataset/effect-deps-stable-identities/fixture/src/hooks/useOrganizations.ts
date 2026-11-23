import type { Organization, OrganizationFilters } from '../api/client';

export interface OrganizationsState {
  /** `null` until the first response arrives. */
  organizations: Organization[] | null;
  error: string | null;
}

/**
 * The organizations of the account picked in the header that match `filters`, from GET /organizations.
 *
 * TODO: not implemented yet. The dashboard still loads its organizations itself.
 */
export function useOrganizations(filters: OrganizationFilters): OrganizationsState {
  void filters;
  return { organizations: null, error: null };
}
