export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "paid" | "pending" | "refunded";

export interface OrderRow {
  id: string;
  orderNumber: string;
  customer: string;
  channel: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: string;
  placedAt: string;
}

export interface OrderMetric {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
}

const ROWS: OrderRow[] = [
  { id: "ord-01", orderNumber: "VY-2049", customer: "Chioma Eze", channel: "Online store", status: "pending", paymentStatus: "pending", total: "₦485,000", placedAt: "6 min ago" },
  { id: "ord-02", orderNumber: "VY-2048", customer: "Ngozi Umeh", channel: "Lagos showroom", status: "processing", paymentStatus: "paid", total: "₦612,500", placedAt: "24 min ago" },
  { id: "ord-03", orderNumber: "VY-2047", customer: "Blessing Okoro", channel: "Online store", status: "shipped", paymentStatus: "paid", total: "₦298,000", placedAt: "1 hr ago" },
  { id: "ord-04", orderNumber: "VY-2046", customer: "Amaka Nwosu", channel: "Online store", status: "delivered", paymentStatus: "paid", total: "₦740,000", placedAt: "Yesterday" },
  { id: "ord-05", orderNumber: "VY-2045", customer: "Funmi Adisa", channel: "Lagos showroom", status: "cancelled", paymentStatus: "refunded", total: "₦210,000", placedAt: "Yesterday" },
  { id: "ord-06", orderNumber: "VY-2044", customer: "Ijeoma Chukwu", channel: "Online store", status: "delivered", paymentStatus: "paid", total: "₦365,000", placedAt: "2 days ago" },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<OrderStatus, string> = {
  pending: "warning",
  processing: "neutral",
  shipped: "neutral",
  delivered: "positive",
  cancelled: "negative",
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  refunded: "Refunded",
};

const PAYMENT_TONE: Record<PaymentStatus, string> = {
  paid: "positive",
  pending: "warning",
  refunded: "negative",
};

export function getOrderRows(): OrderRow[] {
  return ROWS;
}

export function getOrderStatusLabel(status: OrderStatus): string {
  return STATUS_LABEL[status];
}

export function getOrderStatusTone(status: OrderStatus): string {
  return STATUS_TONE[status];
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_LABEL[status];
}

export function getPaymentStatusTone(status: PaymentStatus): string {
  return PAYMENT_TONE[status];
}

export function getOrderMetrics(): OrderMetric[] {
  const pending = ROWS.filter((row) => row.status === "pending").length;
  const readyToShip = ROWS.filter((row) => row.status === "processing").length;
  const revenue = ROWS
    .filter((row) => row.paymentStatus === "paid")
    .reduce((sum, row) => sum + Number(row.total.replace(/[^\d]/g, "")), 0);

  return [
    { label: "Orders today", value: String(ROWS.length), change: `${pending} awaiting confirmation`, tone: pending ? "warning" : "positive" },
    { label: "Ready to pack", value: String(readyToShip), change: "Warehouse queue", tone: "neutral" },
    { label: "Revenue booked", value: `₦${(revenue / 1_000_000).toFixed(1)}M`, change: "From paid orders", tone: "positive" },
    { label: "Cancelled", value: String(ROWS.filter((row) => row.status === "cancelled").length), change: "This week", tone: "neutral" },
  ];
}
