import { requirePagePermission } from "../../../lib/auth/session";
import { getSupportMetrics, getTicketRows, getTicketStatusLabel, getTicketStatusTone } from "../../../modules/support/service";

export default async function SupportPage() {
  await requirePagePermission("support.view");

  const metrics = getSupportMetrics();
  const rows = getTicketRows();

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Support</p>
          <h1>Every conversation, in one place.</h1>
          <p>Customer tickets stay linked to their order and account history, so replies never lose context.</p>
        </div>
        <div className="erp-hero-actions">
          <button className="erp-button primary">New ticket <span>＋</span></button>
        </div>
      </section>

      <section className="metric-grid" aria-label="Support metrics">
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
              <th>Ticket</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Waiting</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>#{row.ticketNumber}</strong><small>{row.customer}</small></td>
                <td>{row.subject}</td>
                <td><span className={`status-pill ${getTicketStatusTone(row.status)}`}>{getTicketStatusLabel(row.status)}</span></td>
                <td>{row.waitingSince}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
