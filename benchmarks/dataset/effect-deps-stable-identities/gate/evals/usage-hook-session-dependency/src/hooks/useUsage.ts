import { useEffect, useState } from 'react';
import { fetchUsage } from '../api/client';
import { useAccount } from '../context/AccountContext';
import { formatDate, formatMonth } from '../lib/format';

export interface UsagePoint {
  label: string;
  seats: number;
}

/** Seats in use in the account picked in the header over the period, labelled by day, or by month for a year. */
export function useUsage(period: 'month' | 'year'): UsagePoint[] | null {
  const session = useAccount();
  const [points, setPoints] = useState<UsagePoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchUsage(session.account.id, period).then((rows) => {
      if (cancelled) return;
      setPoints(
        rows.map((row) => ({ label: period === 'year' ? formatMonth(row.date) : formatDate(row.date), seats: row.seats }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [session, period]);

  return points;
}
