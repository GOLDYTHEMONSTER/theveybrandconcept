import type { Order } from "../orders/domain";
import { listOrders } from "../orders/store";
import { customerKeyFor, getCustomerRecord } from "./store";

export type CustomerSegment = "vip" | "returning" | "new";

export interface CustomerRow {
  /** Normalized customer name -- the actual grouping key, not an order id (orders don't identify a customer on their own). */
  id: string;
  name: string;
  segment: CustomerSegment;
  hasVipOverride: boolean;
  orderCount: number;
  lastOrderAt: string;
  lifetimeValue: number;
  channels: string[];
}

export interface CustomerDetail extends CustomerRow {
  note: string | null;
  orders: Order[];
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

function groupByCustomer(): Map<string, Order[]> {
  const orders = listOrders().filter((order) => order.status !== "cancelled");
  const grouped = new Map<string, Order[]>();
  for (const order of orders) {
    const key = customerKeyFor(order.customer);
    const existing = grouped.get(key) ?? [];
    existing.push(order);
    grouped.set(key, existing);
  }
  return grouped;
}

function rowFor(key: string, customerOrders: Order[]): CustomerRow {
  const lifetimeValue = customerOrders.reduce((sum, order) => sum + order.total, 0);
  const lastOrderAt = customerOrders.reduce((latest, order) => (order.createdAt > latest ? order.createdAt : latest), customerOrders[0].createdAt);
  const record = getCustomerRecord(key);
  const computedSegment = segmentFor(customerOrders.length, lifetimeValue);
  const segment: CustomerSegment =
    record.vipOverride === true ? "vip" : record.vipOverride === false && computedSegment === "vip" ? "returning" : computedSegment;
  return {
    id: key,
    name: customerOrders[0].customer,
    segment,
    hasVipOverride: record.vipOverride !== null,
    orderCount: customerOrders.length,
    lastOrderAt,
    lifetimeValue,
    channels: [...new Set(customerOrders.map((order) => order.channel))],
  };
}

export function getCustomerRows(): CustomerRow[] {
  return [...groupByCustomer().entries()]
    .map(([key, customerOrders]) => rowFor(key, customerOrders))
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}

export function getCustomerDetail(key: string): CustomerDetail | undefined {
  const customerOrders = groupByCustomer().get(key);
  if (!customerOrders) return undefined;
  const row = rowFor(key, customerOrders);
  const record = getCustomerRecord(key);
  return {
    ...row,
    note: record.note,
    orders: [...customerOrders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  };
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
