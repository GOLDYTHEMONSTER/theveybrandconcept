import Link from "next/link";
import { requirePagePermission } from "../../../lib/auth/session";
import { getFinanceMetrics, getInvoiceRows, getInvoiceStatusLabel, getInvoiceStatusTone } from "../../../modules/finance/service";
import ExportCsvButton from "../_components/ExportCsvButton";
import MetricGrid from "../_components/MetricGrid";

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
        <div className="erp-hero-actions">
          <ExportCsvButton
            filename="invoices.csv"
            rows={rows.map((row) => ({ invoiceNumber: row.invoiceNumber, customer: row.customer, amount: row.amount, status: row.status, orderStatus: row.reference }))}
          />
        </div>
      </section>

      <MetricGrid metrics={metrics} label="Finance metrics" />

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th className="numeric">Amount</th>
              <th>Status</th>
              <th>Order status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "32px 0" }}>No invoices yet.</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.invoiceNumber}</strong></td>
                <td>{row.customer}</td>
                <td className="numeric">{currency.format(row.amount)}</td>
                <td><span className={`status-pill ${getInvoiceStatusTone(row.status)}`}>{getInvoiceStatusLabel(row.status)}</span></td>
                <td style={{ textTransform: "capitalize" }}>{row.reference}</td>
                <td className="numeric">
                  <Link className="erp-button secondary" style={{ height: 30, padding: "0 12px", fontSize: 10 }} href={`/orders/${row.id}`}>
                    {row.status === "overdue" ? "Follow up" : "View order"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
