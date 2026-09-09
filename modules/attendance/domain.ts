export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  department: string;
  clockIn: string;
  clockOut: string | null;
  durationMinutes: number | null;
  note: string | null;
}
