import { useEffect, useState } from 'react';
import { api, describeError, type Billing as BillingData } from '../api';
import { formatCents, formatDate } from '../lib/format';

export function Billing() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getBilling().then(setBilling, (caught) => setError(describeError(caught)));
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!billing) return <p>Loading…</p>;

  const invoices = [...billing.invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

  return (
    <section>
      <h1>Billing</h1>
      <p>
        Plan: <strong>{billing.plan}</strong>, {formatCents(billing.priceCents)} a month
        {billing.coupon && <> (coupon {billing.coupon} applied)</>}
      </p>
      <h2>Invoices</h2>
      <table>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>{formatDate(invoice.issuedAt)}</td>
              <td>{formatCents(invoice.amountCents)}</td>
              <td>
                <a href={invoice.url}>Download</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
