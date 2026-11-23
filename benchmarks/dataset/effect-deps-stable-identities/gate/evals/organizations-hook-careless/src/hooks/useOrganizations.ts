import { useEffect, useState } from 'react';
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
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOrganizations(null);
    setError(null);
    fetchOrganizations(account.id, filters).then(
      (list) => {
        if (!cancelled) setOrganizations(list);
      },
      (caught: unknown) => {
        if (!cancelled) setError(describeError(caught));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [account, filters]);

  return { organizations, error };
}
