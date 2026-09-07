export type TicketStatus = "open" | "waiting_customer" | "resolved";

export interface TicketRow {
  id: string;
  ticketNumber: string;
  customer: string;
  subject: string;
  status: TicketStatus;
  waitingSince: string;
}

export interface SupportMetric {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
}

const ROWS: TicketRow[] = [
  { id: "tk-01", ticketNumber: "T-344", customer: "Chioma Eze", subject: "Sizing question — Naha Veil Dress", status: "open", waitingSince: "4 min" },
  { id: "tk-02", ticketNumber: "T-343", customer: "Order #VY-2039", subject: "Delivery update requested", status: "waiting_customer", waitingSince: "17 min" },
  { id: "tk-03", ticketNumber: "T-342", customer: "Blessing Okoro", subject: "Return request — exchange approved", status: "resolved", waitingSince: "46 min" },
  { id: "tk-04", ticketNumber: "T-341", customer: "Funmi Adisa", subject: "Payment not reflecting", status: "open", waitingSince: "1 hr" },
];

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  waiting_customer: "Waiting on customer",
  resolved: "Resolved",
};

const STATUS_TONE: Record<TicketStatus, string> = {
  open: "warning",
  waiting_customer: "neutral",
  resolved: "positive",
};

export function getTicketRows(): TicketRow[] {
  return ROWS;
}

export function getTicketStatusLabel(status: TicketStatus): string {
  return STATUS_LABEL[status];
}

export function getTicketStatusTone(status: TicketStatus): string {
  return STATUS_TONE[status];
}

export function getSupportMetrics(): SupportMetric[] {
  const open = ROWS.filter((row) => row.status === "open").length;
  return [
    { label: "Open tickets", value: String(open), change: "Awaiting reply", tone: open ? "warning" : "positive" },
    { label: "Resolved today", value: "14", change: "+6 vs daily average", tone: "positive" },
    { label: "First response", value: "18m", change: "Within 30m target", tone: "positive" },
    { label: "Satisfaction", value: "4.8", change: "From 126 responses", tone: "neutral" },
  ];
}
