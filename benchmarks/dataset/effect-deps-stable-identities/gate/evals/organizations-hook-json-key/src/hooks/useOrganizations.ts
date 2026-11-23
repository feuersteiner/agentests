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
  const accountId = account.id;
  const filterKey = JSON.stringify(filters);
  const [state, setState] = useState<OrganizationsState>({ organizations: null, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ organizations: null, error: null });
    fetchOrganizations(accountId, JSON.parse(filterKey) as OrganizationFilters)
      .then((organizations) => {
        if (!cancelled) setState({ organizations, error: null });
      })
      .catch((caught: unknown) => {
        if (!cancelled) setState({ organizations: null, error: describeError(caught) });
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, filterKey]);

  return state;
}
