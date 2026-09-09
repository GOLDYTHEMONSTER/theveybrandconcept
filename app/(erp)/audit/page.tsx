import { requirePagePermission } from "../../../lib/auth/session";
import { listRecentAudit } from "../../../modules/audit/sandbox-log";
import { listRecentSecurityEvents } from "../../../modules/security/sandbox-events";
import AuditTable from "../_components/AuditTable";
import ExportCsvButton from "../_components/ExportCsvButton";
import MetricGrid from "../_components/MetricGrid";
import SecurityEventsTable from "../_components/SecurityEventsTable";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requirePagePermission("audit.view");

  const auditEntries = listRecentAudit(200);
  const securityEvents = listRecentSecurityEvents(200);

  const failedLogins = securityEvents.filter((event) => event.type === "login.failure").length;
  const successfulLogins = securityEvents.filter((event) => event.type === "login.success").length;
  const lastActivity = auditEntries[0]?.occurredAt;

  const metrics = [
    { label: "Audited actions", value: String(auditEntries.length), change: "Products, inventory, orders, checkout", tone: "neutral" as const },
    { label: "Successful logins", value: String(successfulLogins), change: "Recorded this session", tone: "positive" as const },
    { label: "Failed login attempts", value: String(failedLogins), change: failedLogins ? "Review for brute-force patterns" : "None recorded", tone: failedLogins ? "warning" as const : "positive" as const },
    { label: "Last recorded action", value: lastActivity ? new Date(lastActivity).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }) : "—", change: lastActivity ? new Date(lastActivity).toLocaleDateString("en-NG", { dateStyle: "medium" }) : "No activity yet", tone: "neutral" as const },
  ];

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Audit &amp; Security</p>
          <h1>Every sensitive action, on the record.</h1>
          <p>Product changes, stock adjustments, order lifecycle events and login activity — append-only, and visible only to accounts with audit access.</p>
        </div>
        <div className="erp-hero-actions">
          <ExportCsvButton
            filename="audit-trail.csv"
            rows={auditEntries.map((entry) => ({ action: entry.action, actor: entry.actorName, entityType: entry.entityType ?? "", entityId: entry.entityId ?? "", reason: entry.reason ?? "", occurredAt: entry.occurredAt }))}
          />
        </div>
      </section>

      <MetricGrid metrics={metrics} label="Audit metrics" />

      <section style={{ marginBottom: 12 }}>
        <p className="erp-eyebrow">Account activity</p>
        <h2 style={{ font: "500 23px 'Playfair Display', serif", margin: "0 0 16px" }}>Login &amp; session history</h2>
      </section>
      <SecurityEventsTable events={securityEvents} />

      <section style={{ margin: "36px 0 12px" }}>
        <p className="erp-eyebrow">Business audit trail</p>
        <h2 style={{ font: "500 23px 'Playfair Display', serif", margin: "0 0 16px" }}>Recent actions</h2>
      </section>
      <AuditTable entries={auditEntries} />
    </>
  );
}
