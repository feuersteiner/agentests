import { useEffect, useState, type FormEvent } from 'react';
import { api, describeError, type Billing as BillingData } from '../api';
import { Button } from '../components/Button';
import { toast } from '../components/toast';
import { formatCents, formatDate } from '../lib/format';
import { isCouponCode } from '../lib/validate';

export function Billing() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);

  async function applyCoupon(event: FormEvent) {
    event.preventDefault();
    if (!isCouponCode(code)) {
      toast.error('That does not look like a coupon code.');
      return;
    }
    setApplying(true);
    try {
      setBilling(await api.applyCoupon(code));
      setCode('');
      toast.success('Coupon applied');
    } catch (caught) {
      toast.error(describeError(caught));
    } finally {
      setApplying(false);
    }
  }

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
      <form onSubmit={applyCoupon}>
        <label htmlFor="coupon">Coupon code</label>
        <input id="coupon" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} />
        <Button type="submit" variant="primary" loading={applying} disabled={code === ''}>
          Apply
        </Button>
      </form>
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
