import { useEffect, useState } from 'react';
import { fetchOrganizations, type Organization } from '../api/client';

interface OrganizationPickerProps {
  accountId: string;
  value: string | null;
  onChange: (organizationId: string) => void;
  onLoaded: (organizations: Organization[]) => void;
}

export function OrganizationPicker({ accountId, value, onChange, onLoaded }: OrganizationPickerProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchOrganizations(accountId, { status: 'active' }).then((list) => {
      if (cancelled) return;
      setOrganizations(list);
      onLoaded(list);
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, onLoaded]);

  return (
    <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
      <option value="" disabled>
        Pick an organization
      </option>
      {organizations.map((organization) => (
        <option key={organization.id} value={organization.id}>
          {organization.name}
        </option>
      ))}
    </select>
  );
}
