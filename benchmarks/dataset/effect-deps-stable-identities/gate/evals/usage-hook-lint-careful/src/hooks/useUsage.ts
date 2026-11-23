import { useEffect, useState } from 'react';
import { fetchUsage, type UsageRow } from '../api/client';
import { useAccount } from '../context/AccountContext';
import { formatDate, formatMonth } from '../lib/format';

export interface UsagePoint {
  label: string;
  seats: number;
}

function toPoints(rows: UsageRow[], period: 'month' | 'year'): UsagePoint[] {
  return rows.map((row) => ({ label: period === 'year' ? formatMonth(row.date) : formatDate(row.date), seats: row.seats }));
}

/** Seats in use in the account picked in the header over the period, labelled by day, or by month for a year. */
export function useUsage(period: 'month' | 'year'): UsagePoint[] | null {
  const session = useAccount();
  const accountId = session.account.id;
  const [points, setPoints] = useState<UsagePoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchUsage(accountId, period).then((rows) => {
      if (!cancelled) setPoints(toPoints(rows, period));
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, period]);

  return points;
}
