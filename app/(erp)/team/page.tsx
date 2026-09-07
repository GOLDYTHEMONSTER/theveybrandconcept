import { requirePagePermission } from "../../../lib/auth/session";
import { getTeamMetrics, getTeamRows } from "../../../modules/team/service";

export default async function TeamPage() {
  await requirePagePermission("team.view");

  const metrics = getTeamMetrics();
  const rows = getTeamRows();

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Team</p>
          <h1>The people behind the brand.</h1>
          <p>Departments, roles and permissions — every teammate's access is scoped to exactly what their role needs.</p>
        </div>
        <div className="erp-hero-actions">
          <button className="erp-button primary">Invite teammate <span>＋</span></button>
        </div>
      </section>

      <section className="metric-grid" aria-label="Team metrics">
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
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.name}</strong></td>
                <td>{row.roleLabel}</td>
                <td>{row.department}</td>
                <td><span className={`status-pill ${row.status === "active" ? "positive" : "warning"}`}>{row.status === "active" ? "Active" : "On leave"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
