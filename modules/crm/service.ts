import { listOrders } from "../orders/store";

export type CustomerSegment = "vip" | "returning" | "new";

export interface CustomerRow {
  id: string;
  name: string;
  segment: CustomerSegment;
  orderCount: number;
  lastOrderAt: string;
  lifetimeValue: number;
  channels: string[];
}

export interface CrmMetric {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
}

const SEGMENT_LABEL: Record<CustomerSegment, string> = {
  vip: "VIP",
  returning: "Returning",
  new: "New",
};

const SEGMENT_TONE: Record<CustomerSegment, string> = {
  vip: "positive",
  returning: "neutral",
  new: "warning",
};

const VIP_THRESHOLD = 200_000;

function segmentFor(orderCount: number, lifetimeValue: number): CustomerSegment {
  if (orderCount > 1 && lifetimeValue >= VIP_THRESHOLD) return "vip";
  if (orderCount > 1) return "returning";
  return "new";
}

export function getCustomerRows(): CustomerRow[] {
  const orders = listOrders().filter((order) => order.status !== "cancelled");

  const grouped = new Map<string, typeof orders>();
  for (const order of orders) {
    const key = order.customer.trim().toLowerCase();
    const existing = grouped.get(key) ?? [];
    existing.push(order);
    grouped.set(key, existing);
  }

  return [...grouped.entries()]
    .map(([, customerOrders]) => {
      const lifetimeValue = customerOrders.reduce((sum, order) => sum + order.total, 0);
      const lastOrderAt = customerOrders.reduce((latest, order) => (order.createdAt > latest ? order.createdAt : latest), customerOrders[0].createdAt);
      return {
        id: customerOrders[0].id,
        name: customerOrders[0].customer,
        segment: segmentFor(customerOrders.length, lifetimeValue),
        orderCount: customerOrders.length,
        lastOrderAt,
        lifetimeValue,
        channels: [...new Set(customerOrders.map((order) => order.channel))],
      };
    })
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}

export function getCustomerSegmentLabel(segment: CustomerSegment): string {
  return SEGMENT_LABEL[segment];
}

export function getCustomerSegmentTone(segment: CustomerSegment): string {
  return SEGMENT_TONE[segment];
}

export function getCrmMetrics(): CrmMetric[] {
  const rows = getCustomerRows();
  const vip = rows.filter((row) => row.segment === "vip").length;
  const newCustomers = rows.filter((row) => row.segment === "new").length;
  const avgLifetimeValue = rows.length ? rows.reduce((sum, row) => sum + row.lifetimeValue, 0) / rows.length : 0;

  return [
    { label: "Active customers", value: String(rows.length), change: "Derived from orders", tone: "neutral" },
    { label: "VIP accounts", value: String(vip), change: "2+ orders, high value", tone: "positive" },
    { label: "New customers", value: String(newCustomers), change: "First order placed", tone: "positive" },
    { label: "Avg. lifetime value", value: `₦${Math.round(avgLifetimeValue).toLocaleString("en-NG")}`, change: "Across active customers", tone: "neutral" },
  ];
}
