import { requirePagePermission } from "../../../lib/auth/session";
import { getSupportMetrics, getTicketRows, getTicketStatusLabel, getTicketStatusTone } from "../../../modules/support/service";
import MetricGrid from "../_components/MetricGrid";

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
      </section>

      <p className="sandbox-note">
        <span>●</span> Illustrative only — there's no real ticketing backend yet, so these numbers and tickets aren't live data.
      </p>

      <MetricGrid metrics={metrics} label="Support metrics" />

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
