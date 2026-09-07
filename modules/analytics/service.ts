import { listOrders } from "../orders/store";

export interface AnalyticsMetric {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
}

export interface RevenuePoint {
  label: string;
  value: number;
}

export interface ProductPerformance {
  label: string;
  revenue: number;
  units: number;
}

export interface ChannelShare {
  label: string;
  revenue: number;
  share: number;
}

function completedOrders() {
  return listOrders().filter((order) => order.status !== "cancelled");
}

export function getAnalyticsMetrics(): AnalyticsMetric[] {
  const orders = completedOrders();
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const delivered = orders.filter((order) => order.status === "delivered").length;
  const uniqueCustomers = new Set(orders.map((order) => order.customer.toLowerCase())).size;
  const returning = orders.length - uniqueCustomers;
  const conversionBase = listOrders().length || 1;
  const cancelledCount = listOrders().filter((order) => order.status === "cancelled").length;
  const conversionRate = Math.round(((conversionBase - cancelledCount) / conversionBase) * 100);

  return [
    { label: "Revenue", value: `₦${(revenue / 1_000_000).toFixed(1)}M`, change: `${orders.length} orders counted`, tone: "positive" },
    { label: "Orders fulfilled", value: String(delivered), change: `${orders.length} placed total`, tone: "positive" },
    { label: "Order success rate", value: `${conversionRate}%`, change: cancelledCount ? `${cancelledCount} cancelled` : "None cancelled", tone: cancelledCount ? "warning" : "positive" },
    { label: "Repeat customers", value: String(Math.max(returning, 0)), change: `${uniqueCustomers} unique buyers`, tone: "neutral" },
  ];
}

export function getRevenueTrend(days = 7): RevenuePoint[] {
  const orders = completedOrders();
  const buckets: RevenuePoint[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);

    const value = orders
      .filter((order) => {
        const created = new Date(order.createdAt);
        return created >= date && created < nextDate;
      })
      .reduce((sum, order) => sum + order.total, 0);

    buckets.push({ label: date.toLocaleDateString("en-NG", { weekday: "short" }), value });
  }

  return buckets;
}

export function getTopProducts(limit = 5): ProductPerformance[] {
  const totals = new Map<string, ProductPerformance>();

  for (const order of completedOrders()) {
    for (const item of order.items) {
      const key = item.productName;
      const existing = totals.get(key) ?? { label: key, revenue: 0, units: 0 };
      existing.revenue += item.unitPrice * item.quantity;
      existing.units += item.quantity;
      totals.set(key, existing);
    }
  }

  return [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function getChannelBreakdown(): ChannelShare[] {
  const orders = completedOrders();
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0) || 1;
  const totals = new Map<string, number>();

  for (const order of orders) {
    totals.set(order.channel, (totals.get(order.channel) ?? 0) + order.total);
  }

  return [...totals.entries()]
    .map(([label, revenue]) => ({ label, revenue, share: Math.round((revenue / totalRevenue) * 100) }))
    .sort((a, b) => b.revenue - a.revenue);
}
