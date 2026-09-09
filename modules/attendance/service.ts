import { computeTrend, splitByRecency, WEEK_MS } from "../shared/trend";
import { listAttendance, listAttendanceForMember, type AttendanceRecord } from "./store";
import type { MetricCardData } from "../../app/(erp)/_components/MetricGrid";

const SHIFT_START_MINUTES = 9 * 60; // 09:00
const LATE_GRACE_MINUTES = 10;

export interface AttendanceRow {
  id: string;
  memberName: string;
  department: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  durationLabel: string;
  status: "on_time" | "late" | "in_progress";
}

function minutesSinceMidnight(iso: string): number {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

function durationLabel(minutes: number | null): string {
  if (minutes === null) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function toRow(record: AttendanceRecord): AttendanceRow {
  const isLate = minutesSinceMidnight(record.clockIn) > SHIFT_START_MINUTES + LATE_GRACE_MINUTES;
  return {
    id: record.id,
    memberName: record.memberName,
    department: record.department,
    date: new Date(record.clockIn).toLocaleDateString("en-NG", { dateStyle: "medium" }),
    clockIn: new Date(record.clockIn).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
    clockOut: record.clockOut ? new Date(record.clockOut).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }) : null,
    durationLabel: record.clockOut ? durationLabel(record.durationMinutes) : "In progress",
    status: record.clockOut === null ? "in_progress" : isLate ? "late" : "on_time",
  };
}

export function getAttendanceRows(): AttendanceRow[] {
  return listAttendance().map(toRow);
}

export function getAttendanceRowsForMember(memberId: string): AttendanceRow[] {
  return listAttendanceForMember(memberId).map(toRow);
}

export function getAttendanceMetrics(): MetricCardData[] {
  const all = listAttendance();
  const clockedInNow = all.filter((record) => record.clockOut === null).length;
  const completed = all.filter((record) => record.clockOut !== null);

  const { current: currentLate, previous: previousLate } = splitByRecency(
    completed.filter((record) => minutesSinceMidnight(record.clockIn) > SHIFT_START_MINUTES + LATE_GRACE_MINUTES),
    (record) => record.clockIn,
    WEEK_MS
  );
  const lateTrend = computeTrend(currentLate.length, previousLate.length, "down");

  const { current: currentShifts, previous: previousShifts } = splitByRecency(
    completed,
    (record) => record.clockIn,
    WEEK_MS
  );
  const avgHours = (records: AttendanceRecord[]) =>
    records.length ? records.reduce((sum, record) => sum + (record.durationMinutes ?? 0), 0) / records.length / 60 : 0;
  const currentAvg = avgHours(currentShifts);
  const previousAvg = avgHours(previousShifts);
  const hoursTrend = computeTrend(Number(currentAvg.toFixed(1)), Number(previousAvg.toFixed(1)), "up");

  const onTimeRate = completed.length
    ? Math.round(((completed.length - currentLate.length - previousLate.length) / completed.length) * 100)
    : 100;

  return [
    { label: "Clocked in now", value: String(clockedInNow), change: clockedInNow ? "Active on the clock" : "Nobody clocked in", tone: clockedInNow ? "positive" : "neutral" },
    { label: "Shifts this week", value: String(currentShifts.length), change: "Completed shifts, last 7 days", tone: "neutral", trend: computeTrend(currentShifts.length, previousShifts.length, "up") },
    { label: "Avg. hours / shift", value: `${currentAvg.toFixed(1)}h`, change: "This week vs last", tone: "neutral", trend: hoursTrend },
    { label: "Late arrivals", value: String(currentLate.length), change: "This week vs last", tone: currentLate.length ? "warning" : "positive", trend: lateTrend },
    { label: "On-time rate", value: `${onTimeRate}%`, change: "Last 14 days", tone: onTimeRate >= 85 ? "positive" : "warning" },
  ];
}
