import Link from "next/link";
import { requirePagePermission } from "../../../lib/auth/session";
import { getOpenCaseForMember } from "../../../modules/onboarding/store";
import { getTeamMetrics, getTeamRows } from "../../../modules/team/service";
import ExportCsvButton from "../_components/ExportCsvButton";
import MetricGrid from "../_components/MetricGrid";
import OffboardButton from "../_components/OffboardButton";
import PersonBadge from "../_components/PersonBadge";
import TeamRoleSelect from "../_components/TeamRoleSelect";
import TeamStatusButton from "../_components/TeamStatusButton";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  onboarding: "Onboarding",
  active: "Active",
  offboarding: "Offboarding",
  terminated: "Terminated",
  suspended: "Suspended",
};
const STATUS_TONE: Record<string, string> = {
  onboarding: "neutral",
  active: "positive",
  offboarding: "warning",
  terminated: "negative",
  suspended: "warning",
};

export default async function TeamPage() {
  const session = await requirePagePermission("team.view", "team.sales.view");
  const canManage = session.permissions.includes("team.manage");
  const canAssignTasks = session.permissions.includes("tasks.manage");
  const isDepartmentScoped = !session.permissions.includes("team.view");

  const allRows = getTeamRows();
  const rows = isDepartmentScoped ? allRows.filter((row) => row.department === "Sales") : allRows;
  const metrics = getTeamMetrics();

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Team</p>
          <h1>The people behind the brand.</h1>
          <p>
            {isDepartmentScoped
              ? "Your department's roster."
              : "Departments, roles and permissions — every teammate's access is scoped to exactly what their role needs."}
          </p>
        </div>
        <div className="erp-hero-actions">
          <ExportCsvButton
            filename="team.csv"
            rows={rows.map((row) => ({ name: row.name, email: row.email, role: row.roleLabel, department: row.department, status: row.status, permissions: row.permissionCount }))}
          />
          {canManage && <Link href="/team/permissions" className="erp-button secondary">Manage permissions</Link>}
          {canManage && <Link href="/team/invite" className="erp-button primary">Invite teammate <span>＋</span></Link>}
        </div>
      </section>

      {!isDepartmentScoped && <MetricGrid metrics={metrics} label="Team metrics" />}

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Permissions</th>
              {(canManage || canAssignTasks) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><PersonBadge name={row.name} subline={row.email} /></td>
                <td>
                  {canManage ? (
                    <TeamRoleSelect memberId={row.id} currentRole={row.role} disabled={row.id === session.userId} />
                  ) : (
                    row.roleLabel
                  )}
                </td>
                <td>{row.department}</td>
                <td><span className={`status-pill ${STATUS_TONE[row.status]}`}>{STATUS_LABEL[row.status]}</span></td>
                <td>
                  {row.permissionCount} granted
                  {row.hasOverrides && <small style={{ color: "#a06d35" }}>Custom overrides</small>}
                </td>
                {(canManage || canAssignTasks) && (
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                      {(row.status === "onboarding" || row.status === "offboarding") && (() => {
                        const openCase = getOpenCaseForMember(row.id, row.status);
                        return openCase ? (
                          <Link href={`/onboarding/${openCase.id}`} className="erp-button secondary" style={{ height: 28, padding: "0 10px", fontSize: 10 }}>
                            Open checklist
                          </Link>
                        ) : null;
                      })()}
                      {canManage && <TeamStatusButton memberId={row.id} currentStatus={row.status} disabled={row.id === session.userId} />}
                      {canManage && row.status === "active" && row.id !== session.userId && <OffboardButton memberId={row.id} />}
                      {canAssignTasks && row.status === "active" && (
                        <Link href={`/tasks/new?assigneeId=${row.id}`} className="erp-button secondary" style={{ height: 28, padding: "0 10px", fontSize: 10 }}>
                          Assign task
                        </Link>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <p className="sandbox-note">
          <span>●</span> Role and permission changes apply the next time that teammate signs in — sandbox sessions carry
          their permissions from login, not live.
        </p>
      )}
    </>
  );
}
