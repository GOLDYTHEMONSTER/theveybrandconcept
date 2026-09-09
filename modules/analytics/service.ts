import { ORDER_STATUSES, type OrderStatus } from "../orders/domain";
import { listOrders } from "../orders/store";
import { listReturns } from "../returns/store";
import { computeTrend, splitByRecency, WEEK_MS, type Trend } from "../shared/trend";

export interface AnalyticsMetric {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
  trend?: Trend;
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

export interface OrderStatusShare {
  status: OrderStatus;
  label: string;
  count: number;
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

  const { current: revenueOrdersThisWeek, previous: revenueOrdersLastWeek } = splitByRecency(orders, (o) => o.createdAt, WEEK_MS);
  const revenueThisWeek = revenueOrdersThisWeek.reduce((sum, o) => sum + o.total, 0);
  const revenueLastWeek = revenueOrdersLastWeek.reduce((sum, o) => sum + o.total, 0);
  const { rate: returnRate, trend: returnRateTrend } = getReturnRateTrend();

  return [
    {
      label: "Revenue",
      value: `₦${(revenue / 1_000_000).toFixed(1)}M`,
      change: `${orders.length} orders counted`,
      tone: "positive",
      trend: computeTrend(revenueThisWeek, revenueLastWeek, "up"),
    },
    { label: "Orders fulfilled", value: String(delivered), change: `${orders.length} placed total`, tone: "positive" },
    { label: "Order success rate", value: `${conversionRate}%`, change: cancelledCount ? `${cancelledCount} cancelled` : "None cancelled", tone: cancelledCount ? "warning" : "positive" },
    { label: "Repeat customers", value: String(Math.max(returning, 0)), change: `${uniqueCustomers} unique buyers`, tone: "neutral" },
    { label: "Return rate", value: `${returnRate}%`, change: "Of delivered orders", tone: returnRate > 10 ? "warning" : "positive", trend: returnRateTrend },
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

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Where every order actually is right now -- the fixed lifecycle order matters for the validated chart color adjacency, see erp.css --chart-status-*. */
export function getOrderStatusBreakdown(): OrderStatusShare[] {
  const orders = listOrders();
  const total = orders.length || 1;
  return ORDER_STATUSES.map((status) => {
    const count = orders.filter((order) => order.status === status).length;
    return { status, label: STATUS_LABEL[status], count, share: Math.round((count / total) * 100) };
  });
}

/** Delivered orders that came back as a return, this period vs last -- the actual "advanced" cross-module metric: Returns didn't exist as a concept until this session's Returns tool. */
export function getReturnRateTrend(): { rate: number; trend: Trend } {
  const delivered = listOrders().filter((order) => order.status === "delivered" || listReturns().some((r) => r.orderId === order.id));
  const returns = listReturns();
  const rate = delivered.length ? Math.round((returns.length / delivered.length) * 100) : 0;

  const { current: returnsThisWeek, previous: returnsLastWeek } = splitByRecency(returns, (r) => r.createdAt, WEEK_MS);
  return { rate, trend: computeTrend(returnsThisWeek.length, returnsLastWeek.length, "down") };
}
