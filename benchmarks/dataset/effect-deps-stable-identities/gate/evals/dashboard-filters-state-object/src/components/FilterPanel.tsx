import type { OrganizationFilters, OrganizationStatus, Plan } from '../api/client';

export function FilterPanel({ value, onChange }: { value: OrganizationFilters; onChange: (next: OrganizationFilters) => void }) {
  return (
    <fieldset>
      <legend>Filters</legend>
      <select value={value.status ?? ''} onChange={(event) => onChange({ ...value, status: (event.target.value || undefined) as OrganizationStatus | undefined })}>
        <option value="">Any status</option>
        <option value="active">Active</option>
        <option value="trial">Trial</option>
        <option value="suspended">Suspended</option>
      </select>
      <select value={value.plan ?? ''} onChange={(event) => onChange({ ...value, plan: (event.target.value || undefined) as Plan | undefined })}>
        <option value="">Any plan</option>
        <option value="starter">Starter</option>
        <option value="growth">Growth</option>
        <option value="enterprise">Enterprise</option>
      </select>
      <input type="search" placeholder="Search by name" value={value.search ?? ''} onChange={(event) => onChange({ ...value, search: event.target.value })} />
    </fieldset>
  );
}
