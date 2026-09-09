import Link from "next/link";
import { getSessionContext } from "../../../lib/auth/session";
import { getDashboardForRole } from "../../../modules/dashboard/service";
import AccessDeniedBanner from "../_components/AccessDeniedBanner";
import ExportCsvButton from "../_components/ExportCsvButton";
import MetricGrid from "../_components/MetricGrid";

export default async function DashboardPage() {
  const session = await getSessionContext();
  const view = getDashboardForRole(session.role);

  const createTarget = session.permissions.includes("orders.create")
    ? { href: "/orders/new", label: "Create order" }
    : session.permissions.includes("products.create")
      ? { href: "/inventory/new", label: "Create product" }
      : null;

  return (
    <>
      <AccessDeniedBanner />
      <section className="erp-hero">
        <div><p className="erp-eyebrow">{view.eyebrow}</p><h1>{view.title}</h1><p>{view.summary}</p></div>
        <div className="erp-hero-actions">
          <ExportCsvButton
            filename="dashboard-activity.csv"
            rows={view.activities.map((activity) => ({ title: activity.title, detail: activity.detail, tag: activity.tag, time: activity.time }))}
          />
          {createTarget && <Link className="erp-button primary" href={createTarget.href}>{createTarget.label} <span>＋</span></Link>}
        </div>
      </section>

      <MetricGrid metrics={view.metrics} />

      <section className="dashboard-grid">
        <article className="erp-panel activity-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">Latest updates</p><h2>{view.activityTitle}</h2></div><Link href="/audit">View all</Link></div>
          <div className="activity-list">
            {view.activities.map((activity) => (
              <div className="activity-row" key={activity.title}>
                <span className="activity-mark">{activity.tag.slice(0, 1)}</span>
                <div><strong>{activity.title}</strong><small>{activity.detail}</small></div>
                <span className="activity-tag">{activity.tag}</span><time>{activity.time}</time>
              </div>
            ))}
          </div>
        </article>

        <article className="erp-panel focus-panel">
          <div className="panel-heading"><div><p className="erp-eyebrow">At a glance</p><h2>{view.focusTitle}</h2></div></div>
          <div className="focus-list">
            {view.focusItems.map((item, index) => (
              <div className="focus-row" key={item.label}>
                <span className="focus-index">0{index + 1}</span>
                <div><strong>{item.label}</strong><small>{item.note}</small></div><b>{item.value}</b>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
