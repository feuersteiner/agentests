import { useCallback, useEffect, useState } from 'react';
import { describeError, fetchOrganizations, type Organization } from '../api/client';
import { useAccount } from '../context/AccountContext';
import { useUsage } from '../hooks/useUsage';
import { formatDate, formatSeats, planLabel, statusLabel } from '../lib/format';

const maxAttempts = 3;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function Dashboard() {
  const { account } = useAccount();
  const accountId = account.id;
  const usage = useUsage('month');
  const [organizations, setOrganizations] = useState<Organization[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOrganizations = useCallback(
    async (signal: AbortSignal) => {
      setOrganizations(null);
      setError(null);
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          setOrganizations(await fetchOrganizations(accountId, {}, signal));
          return;
        } catch (caught) {
          if (signal.aborted) return;
          if (attempt === maxAttempts) setError(describeError(caught));
          else await wait(500 * 2 ** attempt);
        }
      }
    },
    [accountId]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadOrganizations(controller.signal);
    return () => controller.abort();
  }, [loadOrganizations]);

  const seatsNow = usage && usage.length > 0 ? usage[usage.length - 1].seats : null;

  return (
    <section>
      <h1>{account.name}</h1>
      {seatsNow !== null && <p>{formatSeats(seatsNow)} in use this month</p>}
      {error && <p role="alert">{error}</p>}
      {!error && !organizations && <p>Loading organizations…</p>}
      {organizations && (
        <table>
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
