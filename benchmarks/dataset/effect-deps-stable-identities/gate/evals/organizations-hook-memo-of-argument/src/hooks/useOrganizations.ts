import { useEffect, useMemo, useState } from 'react';
import { describeError, fetchOrganizations, type Organization, type OrganizationFilters } from '../api/client';
import { useAccount } from '../context/AccountContext';

export interface OrganizationsState {
  /** `null` until the first response arrives. */
  organizations: Organization[] | null;
  error: string | null;
}

/** The organizations of the account picked in the header that match `filters`, from GET /organizations. */
export function useOrganizations(filters: OrganizationFilters): OrganizationsState {
  const { account } = useAccount();
  const accountId = account.id;
  const query = useMemo(() => ({ ...filters, search: filters.search?.trim() }), [filters]);
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setOrganizations(null);
    setError(null);
    fetchOrganizations(accountId, query, controller.signal).then(setOrganizations, (caught: unknown) => {
      if (!controller.signal.aborted) setError(describeError(caught));
    });
    return () => controller.abort();
  }, [accountId, query]);

  return { organizations, error };
}
