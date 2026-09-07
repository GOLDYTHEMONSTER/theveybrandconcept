import { requirePagePermission } from "../../../lib/auth/session";
import { getFinanceMetrics, getInvoiceRows, getInvoiceStatusLabel, getInvoiceStatusTone } from "../../../modules/finance/service";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default async function FinancePage() {
  await requirePagePermission("finance.view");

  const metrics = getFinanceMetrics();
  const rows = getInvoiceRows();

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Finance</p>
          <h1>Cash position, at a glance.</h1>
          <p>Every non-cancelled order stands in as its own invoice — paid on delivery, outstanding until then.</p>
        </div>
      </section>

      <section className="metric-grid" aria-label="Finance metrics">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="metric-label"><span>{metric.label}</span><button>•••</button></div>
            <strong>{metric.value}</strong>
            <small className={`metric-change ${metric.tone ?? "neutral"}`}>{metric.change}</small>
          </article>
        ))}
      </section>

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th className="numeric">Amount</th>
              <th>Status</th>
              <th>Order status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: "32px 0" }}>No invoices yet.</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.invoiceNumber}</strong></td>
                <td>{row.customer}</td>
                <td className="numeric">{currency.format(row.amount)}</td>
                <td><span className={`status-pill ${getInvoiceStatusTone(row.status)}`}>{getInvoiceStatusLabel(row.status)}</span></td>
                <td style={{ textTransform: "capitalize" }}>{row.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
