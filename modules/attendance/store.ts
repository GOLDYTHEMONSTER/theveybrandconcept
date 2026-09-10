import { randomUUID } from "crypto";
import { ConflictError, NotFoundError, ValidationError } from "../shared/errors";
import { stableId } from "../shared/seeded-random";
import { getTeamMember, listTeamMembers } from "../team/store";
import type { AttendanceRecord } from "./domain";

export type { AttendanceRecord } from "./domain";

const globalAttendance = globalThis as typeof globalThis & { __veyAttendance?: AttendanceRecord[] };

const DAY_MS = 24 * 60 * 60 * 1000;

function atTime(daysAgo: number, hour: number, minute: number): string {
  const date = new Date(Date.now() - daysAgo * DAY_MS);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function isWeekend(daysAgo: number): boolean {
  const date = new Date(Date.now() - daysAgo * DAY_MS);
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Seeds two work-weeks of plausible clock-in/out history per teammate so the
 * Attendance page's week-over-week trends (see modules/attendance/service.ts)
 * are computed from real timestamped records rather than fabricated deltas.
 * The most recent workday is left with an open (no clock-out) record for
 * whichever member the seed marks "still in" so the page always has at
 * least one live example without depending on wall-clock time of day.
 */
function seed(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const members = listTeamMembers();
  const clockInOffsets = [-6, -2, 4, 12, 0, -4, 8]; // minutes around 09:00
  const clockOutOffsets = [-10, 5, 20, -5, 15, 0, 10]; // minutes around 17:30

  members.forEach((member, memberIndex) => {
    for (let daysAgo = 1; daysAgo <= 13; daysAgo += 1) {
      if (isWeekend(daysAgo)) continue;
      const inOffset = clockInOffsets[(daysAgo + memberIndex) % clockInOffsets.length];
      const outOffset = clockOutOffsets[(daysAgo + memberIndex) % clockOutOffsets.length];
      const clockIn = atTime(daysAgo, 9, Math.max(0, 0 + inOffset));
      const clockOutDate = new Date(new Date(clockIn).getTime());
      clockOutDate.setHours(17, Math.max(0, 30 + outOffset), 0, 0);
      const clockOut = clockOutDate.toISOString();
      const durationMinutes = Math.round((new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000);
      records.push({
        id: stableId(`attendance-seed-${member.id}-${daysAgo}`),
        memberId: member.id,
        memberName: member.name,
        department: member.department,
        clockIn,
        clockOut,
        durationMinutes,
        note: null,
      });
    }
  });

  // Leave one teammate clocked in right now (today, no clock-out yet) so the
  // "currently on the clock" state has a real example out of the box.
  if (members[0] && !isWeekend(0)) {
    records.push({
      id: stableId(`attendance-seed-open-${members[0].id}`),
      memberId: members[0].id,
      memberName: members[0].name,
      department: members[0].department,
      clockIn: atTime(0, 8, 57),
      clockOut: null,
      durationMinutes: null,
      note: null,
    });
  }

  return records;
}

if (!globalAttendance.__veyAttendance) {
  globalAttendance.__veyAttendance = seed();
}

function store(): AttendanceRecord[] {
  return globalAttendance.__veyAttendance!;
}

export function listAttendance(): AttendanceRecord[] {
  return [...store()].sort((a, b) => b.clockIn.localeCompare(a.clockIn));
}

export function listAttendanceForMember(memberId: string): AttendanceRecord[] {
  return listAttendance().filter((record) => record.memberId === memberId);
}

export function getOpenRecordForMember(memberId: string): AttendanceRecord | null {
  return store().find((record) => record.memberId === memberId && record.clockOut === null) ?? null;
}

export function clockIn(memberId: string): AttendanceRecord {
  const member = getTeamMember(memberId);
  if (getOpenRecordForMember(memberId)) {
    throw new ConflictError("Already clocked in — clock out first.");
  }
  const record: AttendanceRecord = {
    id: randomUUID(),
    memberId: member.id,
    memberName: member.name,
    department: member.department,
    clockIn: new Date().toISOString(),
    clockOut: null,
    durationMinutes: null,
    note: null,
  };
  store().push(record);
  return record;
}

export function clockOut(memberId: string, note?: string | null): AttendanceRecord {
  const record = getOpenRecordForMember(memberId);
  if (!record) {
    throw new ValidationError("Not clocked in yet.");
  }
  record.clockOut = new Date().toISOString();
  record.durationMinutes = Math.round((new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime()) / 60000);
  if (note) record.note = note.trim().slice(0, 240);
  return record;
}

export function getAttendanceRecord(id: string): AttendanceRecord {
  const record = store().find((item) => item.id === id);
  if (!record) throw new NotFoundError("Attendance record not found");
  return record;
}
