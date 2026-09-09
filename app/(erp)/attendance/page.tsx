import { requirePagePermission } from "../../../lib/auth/session";
import { getAttendanceMetrics, getAttendanceRows, getAttendanceRowsForMember } from "../../../modules/attendance/service";
import { getOpenRecordForMember } from "../../../modules/attendance/store";
import ClockCard from "../_components/ClockCard";
import ExportCsvButton from "../_components/ExportCsvButton";
import MetricGrid from "../_components/MetricGrid";
import PersonBadge from "../_components/PersonBadge";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { on_time: "On time", late: "Late", in_progress: "In progress" };
const STATUS_TONE: Record<string, string> = { on_time: "positive", late: "warning", in_progress: "neutral" };

export default async function AttendancePage() {
  const session = await requirePagePermission("attendance.view");
  const canManage = session.permissions.includes("attendance.manage");

  const openRecord = getOpenRecordForMember(session.userId);
  const rows = canManage ? getAttendanceRows() : getAttendanceRowsForMember(session.userId);
  const metrics = canManage ? getAttendanceMetrics() : undefined;

  return (
    <>
      <section className="erp-hero">
        <div>
          <p className="erp-eyebrow">Attendance</p>
          <h1>{canManage ? "Who's on the clock, at a glance." : "Your attendance record."}</h1>
          <p>
            {canManage
              ? "Every clock-in and clock-out across the team, with late arrivals and hours flagged automatically."
              : "Clock in when your shift starts, clock out when it ends — your history is kept below."}
          </p>
        </div>
        {canManage && (
          <div className="erp-hero-actions">
            <ExportCsvButton
              filename="attendance.csv"
              rows={rows.map((row) => ({ name: row.memberName, department: row.department, date: row.date, clockIn: row.clockIn, clockOut: row.clockOut ?? "", duration: row.durationLabel, status: STATUS_LABEL[row.status] }))}
            />
          </div>
        )}
      </section>

      <ClockCard clockInAt={openRecord?.clockIn ?? null} />

      {metrics && <MetricGrid metrics={metrics} label="Attendance metrics" />}

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              {canManage && <th>Teammate</th>}
              <th>Date</th>
              <th>Clock in</th>
              <th>Clock out</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {canManage && <td><PersonBadge name={row.memberName} subline={row.department} /></td>}
                <td>{row.date}</td>
                <td>{row.clockIn}</td>
                <td>{row.clockOut ?? "—"}</td>
                <td>
                  {row.durationLabel}
                  {row.note && <small>{row.note}</small>}
                </td>
                <td><span className={`status-pill ${STATUS_TONE[row.status]}`}>{STATUS_LABEL[row.status]}</span></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={canManage ? 6 : 5} style={{ textAlign: "center", color: "var(--muted)" }}>No attendance recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {!canManage && (
        <p className="sandbox-note">
          <span>●</span> You're seeing only your own attendance. Executives and HR can view and export the full team's record.
        </p>
      )}
    </>
  );
}
