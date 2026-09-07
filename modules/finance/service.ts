import { listOrders } from "../orders/store";

export type InvoiceStatus = "paid" | "outstanding" | "overdue";

export interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  customer: string;
  amount: number;
  status: InvoiceStatus;
  reference: string;
}

export interface FinanceMetric {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  paid: "Paid",
  outstanding: "Outstanding",
  overdue: "Overdue",
};

const STATUS_TONE: Record<InvoiceStatus, string> = {
  paid: "positive",
  outstanding: "warning",
  overdue: "negative",
};

const OVERDUE_HOURS = 72;

/**
 * There is no separate payment/invoicing ledger yet — every non-cancelled
 * order stands in as its own invoice: "paid" once delivered, "overdue" if
 * it's sat unconfirmed for more than 72h, otherwise "outstanding".
 */
export function getInvoiceRows(): InvoiceRow[] {
  const now = Date.now();
  return listOrders()
    .filter((order) => order.status !== "cancelled")
    .map((order) => {
      const ageHours = (now - new Date(order.createdAt).getTime()) / 3_600_000;
      const status: InvoiceStatus =
        order.status === "delivered" ? "paid" : order.status === "pending" && ageHours > OVERDUE_HOURS ? "overdue" : "outstanding";
      return {
        id: order.id,
        invoiceNumber: order.orderNumber,
        customer: order.customer,
        amount: order.total,
        status,
        reference: order.status,
      };
    });
}

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  return STATUS_LABEL[status];
}

export function getInvoiceStatusTone(status: InvoiceStatus): string {
  return STATUS_TONE[status];
}

export function getFinanceMetrics(): FinanceMetric[] {
  const rows = getInvoiceRows();
  const paidRevenue = rows.filter((row) => row.status === "paid").reduce((sum, row) => sum + row.amount, 0);
  const outstanding = rows.filter((row) => row.status !== "paid");
  const overdue = rows.filter((row) => row.status === "overdue").length;

  return [
    { label: "Revenue collected", value: `₦${(paidRevenue / 1_000_000).toFixed(1)}M`, change: `${rows.filter((r) => r.status === "paid").length} delivered orders`, tone: "positive" },
    { label: "Outstanding", value: String(outstanding.length), change: `₦${(outstanding.reduce((s, r) => s + r.amount, 0) / 1_000_000).toFixed(1)}M pending`, tone: outstanding.length ? "warning" : "positive" },
    { label: "Overdue", value: String(overdue), change: overdue ? "Unconfirmed 72h+" : "None overdue", tone: overdue ? "warning" : "positive" },
    { label: "Total invoices", value: String(rows.length), change: "Excludes cancelled orders", tone: "neutral" },
  ];
}
