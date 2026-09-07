export interface TeamMemberRow {
  id: string;
  name: string;
  roleLabel: string;
  department: string;
  status: "active" | "on_leave";
}

export interface TeamMetric {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
}

const ROWS: TeamMemberRow[] = [
  { id: "team-01", name: "Veronica Young", roleLabel: "Executive", department: "Executive", status: "active" },
  { id: "team-02", name: "Amara Okafor", roleLabel: "Sales Manager", department: "Sales", status: "active" },
  { id: "team-03", name: "David Chen", roleLabel: "Warehouse Manager", department: "Operations", status: "active" },
  { id: "team-04", name: "Ife Bello", roleLabel: "Customer Support", department: "Customer Service", status: "active" },
  { id: "team-05", name: "Tunde Ajayi", roleLabel: "Sales Representative", department: "Sales", status: "on_leave" },
];

export function getTeamRows(): TeamMemberRow[] {
  return ROWS;
}

export function getTeamMetrics(): TeamMetric[] {
  const onLeave = ROWS.filter((row) => row.status === "on_leave").length;
  return [
    { label: "Team members", value: String(ROWS.length), change: "Across 4 departments", tone: "neutral" },
    { label: "Active today", value: String(ROWS.length - onLeave), change: "Clocked in", tone: "positive" },
    { label: "On leave", value: String(onLeave), change: onLeave ? "Approved leave" : "None scheduled", tone: onLeave ? "warning" : "positive" },
    { label: "Open roles", value: "1", change: "Warehouse assistant", tone: "neutral" },
  ];
}
