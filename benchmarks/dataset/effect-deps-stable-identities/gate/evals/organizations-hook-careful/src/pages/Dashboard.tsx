import { useAccount } from '../context/AccountContext';
import { useOrganizations } from '../hooks/useOrganizations';
import { useUsage } from '../hooks/useUsage';
import { formatDate, formatSeats, planLabel, statusLabel } from '../lib/format';

export function Dashboard() {
  const { account } = useAccount();
  const usage = useUsage('month');
  const { organizations, error } = useOrganizations({ status: 'active' });

  const seatsNow = usage && usage.length > 0 ? usage[usage.length - 1].seats : null;

  return (
    <section>
      <h1>{account.name}</h1>
      {seatsNow !== null && <p>{formatSeats(seatsNow)} in use this month</p>}
      {error && <p role="alert">{error}</p>}
      {!error && !organizations && <p>Loading organizations…</p>}
      {organizations && (
        <table>
          <thead>
            <tr>
              <th>Organization</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Seats</th>
              <th>Customer since</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((organization) => (
              <tr key={organization.id}>
                <td>{organization.name}</td>
                <td>{planLabel(organization.plan)}</td>
                <td>{statusLabel(organization.status)}</td>
                <td>{formatSeats(organization.seats)}</td>
                <td>{formatDate(organization.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
