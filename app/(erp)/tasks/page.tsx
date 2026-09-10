import Link from "next/link";
import { requirePagePermission } from "../../../lib/auth/session";
import { getTaskMetrics, getTaskRows, getTaskRowsForAssignee, STATUS_LABEL } from "../../../modules/tasks/service";
import { listTasks, listTasksForAssignee } from "../../../modules/tasks/store";
import ExportCsvButton from "../_components/ExportCsvButton";
import MetricGrid from "../_components/MetricGrid";
import PersonBadge from "../_components/PersonBadge";
import TaskStatusButton from "../_components/TaskStatusButton";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await requirePagePermission("tasks.view");
  const canManage = session.permissions.includes("tasks.manage");

  const tasks = canManage ? listTasks() : listTasksForAssignee(session.userId);
  const rows = canManage ? getTaskRows() : getTaskRowsForAssignee(session.userId);
  const metrics = getTaskMetrics(tasks);

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Tasks</p>
          <h1>{canManage ? "Everything assigned, everywhere." : "Your task list."}</h1>
          <p>
            {canManage
              ? "Assign work, track it through to done, and see who's carrying what."
              : "Tasks assigned to you, with priority and due dates so nothing slips."}
          </p>
        </div>
        <div className="erp-hero-actions">
          <ExportCsvButton
            filename="tasks.csv"
            rows={rows.map((row) => ({ task: `#${row.taskNumber}`, title: row.title, assignee: row.assigneeName, assignedBy: row.assignedByName, priority: row.priority, status: STATUS_LABEL[row.status], due: row.dueDateLabel ?? "" }))}
          />
          {canManage && <Link href="/tasks/new" className="erp-button primary">Assign task <span>＋</span></Link>}
        </div>
      </section>

      <MetricGrid metrics={metrics} label="Task metrics" />

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Task</th>
              {canManage && <th>Assignee</th>}
              <th>Assigned by</th>
              <th>Priority</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>#{row.taskNumber}</strong><small>{row.title}</small></td>
                {canManage && <td><PersonBadge name={row.assigneeName} /></td>}
                <td>{row.assignedByName}</td>
                <td><span className={`priority-pill ${row.priority}`}>{row.priority}</span></td>
                <td>
                  {row.dueDateLabel ?? "—"}
                  {row.isOverdue && <small style={{ color: "#8b2d24", display: "block" }}>Overdue</small>}
                </td>
                <td><TaskStatusButton taskId={row.id} currentStatus={row.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={canManage ? 6 : 5} style={{ textAlign: "center", color: "var(--muted)" }}>No tasks yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {!canManage && (
        <p className="sandbox-note">
          <span>●</span> You&apos;re seeing only tasks assigned to you. Update the status as you make progress.
        </p>
      )}
    </>
  );
}
