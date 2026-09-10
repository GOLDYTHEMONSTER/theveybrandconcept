import Link from "next/link";
import { requirePagePermission } from "../../../lib/auth/session";
import { getLifecycleMetrics, getOffboardingRows, getOnboardingRows } from "../../../modules/onboarding/service";
import ExportCsvButton from "../_components/ExportCsvButton";
import MetricGrid from "../_components/MetricGrid";
import PersonBadge from "../_components/PersonBadge";

export const dynamic = "force-dynamic";

function CaseTable({ rows, emptyLabel }: { rows: ReturnType<typeof getOnboardingRows>; emptyLabel: string }) {
  return (
    <div className="erp-table-wrap">
      <table className="erp-table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Role</th>
            <th>Started</th>
            <th>Progress</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><PersonBadge name={row.memberName} subline={row.department} /></td>
              <td>{row.role.replace(/_/g, " ")}</td>
              <td>{new Date(row.startedAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}</td>
              <td>{row.stepsDone} / {row.stepsTotal} steps</td>
              <td><span className={`status-pill ${row.status === "completed" ? "positive" : "warning"}`}>{row.status === "completed" ? "Completed" : "In progress"}</span></td>
              <td><Link href={`/onboarding/${row.id}`} className="erp-button secondary" style={{ height: 30, padding: "0 12px", fontSize: 10 }}>Open checklist</Link></td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)" }}>{emptyLabel}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function OnboardingPage() {
  const session = await requirePagePermission("team.manage", "onboarding.view");
  const canManage = session.permissions.includes("team.manage");

  const metrics = getLifecycleMetrics();
  const onboardingRows = canManage ? getOnboardingRows() : getOnboardingRows().filter((row) => row.memberId === session.userId);
  const offboardingRows = canManage ? getOffboardingRows() : [];

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Onboarding &amp; Offboarding</p>
          <h1>{canManage ? "Every arrival and every exit, tracked." : "Your onboarding checklist."}</h1>
          <p>
            {canManage
              ? "A new hire starts with narrow access and a checklist; an exit starts with access already revoked. Neither one is a permission the roster page can express on its own."
              : "Complete each step below — your full role access activates automatically once everything required is done."}
          </p>
        </div>
        {canManage && (
          <div className="erp-hero-actions">
            <ExportCsvButton
              filename="lifecycle-cases.csv"
              rows={[...onboardingRows, ...offboardingRows].map((row) => ({ kind: row.kind, name: row.memberName, role: row.role, department: row.department, started: row.startedAt, status: row.status, steps: `${row.stepsDone}/${row.stepsTotal}` }))}
            />
            <Link href="/team/invite" className="erp-button primary">Invite teammate <span>＋</span></Link>
          </div>
        )}
      </section>

      <MetricGrid metrics={metrics} label="Lifecycle metrics" />

      <section style={{ marginBottom: 16 }}>
        <p className="erp-eyebrow">New hires</p>
        <h2 style={{ font: "500 23px 'Playfair Display', serif", margin: "0 0 16px" }}>Onboarding</h2>
      </section>
      <CaseTable rows={onboardingRows} emptyLabel="No onboarding cases yet." />

      {canManage && (
        <>
          <section style={{ margin: "36px 0 16px" }}>
            <p className="erp-eyebrow">Departures</p>
            <h2 style={{ font: "500 23px 'Playfair Display', serif", margin: "0 0 16px" }}>Offboarding</h2>
          </section>
          <CaseTable rows={offboardingRows} emptyLabel="No offboarding cases — nobody is currently leaving." />
        </>
      )}
    </>
  );
}
