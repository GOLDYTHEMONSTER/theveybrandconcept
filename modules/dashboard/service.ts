import type { SandboxRole } from "../authentication/domain";
import { listOrders } from "../orders/store";
import { getInventoryMetrics, getInventoryValue } from "../inventory/service";
import { listRecentAudit, type SandboxAuditEntry } from "../audit/sandbox-log";
import { computeTrend, splitByRecency, WEEK_MS, type Trend } from "../shared/trend";

export interface DashboardMetric {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
  trend?: Trend;
}

export interface DashboardView {
  eyebrow: string;
  title: string;
  summary: string;
  metrics: DashboardMetric[];
  activityTitle: string;
  activities: Array<{ title: string; detail: string; time: string; tag: string }>;
  focusTitle: string;
  focusItems: Array<{ label: string; value: string; note: string }>;
}

function relativeTime(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  return `${Math.round(hours / 24)} d`;
}

function describeAuditEntry(entry: SandboxAuditEntry): { title: string; detail: string; tag: string } {
  const after = (entry.afterValue ?? {}) as Record<string, unknown>;
  switch (entry.action) {
    case "orders.create":
      return { title: `Order #${after.orderNumber ?? "—"} created`, detail: `${after.customer ?? entry.actorName} · ₦${Number(after.total ?? 0).toLocaleString("en-NG")}`, tag: "Order" };
    case "storefront.checkout":
      return { title: `Online order #${after.orderNumber ?? "—"} placed`, detail: `${entry.actorName} · ₦${Number(after.total ?? 0).toLocaleString("en-NG")}`, tag: "Online" };
    case "orders.ship":
      return { title: `Order #${after.orderNumber ?? "—"}… shipped`, detail: String(after.carrier ?? "Carrier assigned"), tag: "Shipped" };
    case "orders.cancel":
      return { title: "Order cancelled", detail: entry.reason ?? "No reason given", tag: "Cancelled" };
    case "orders.deliver":
      return { title: "Order delivered", detail: entry.actorName, tag: "Delivered" };
    case "inventory.adjust":
      return { title: "Stock adjusted", detail: entry.reason ?? "Manual adjustment", tag: "Inventory" };
    case "products.create":
      return { title: "New product added", detail: String(after.name ?? ""), tag: "Catalog" };
    default:
      return { title: entry.action, detail: entry.actorName, tag: "Activity" };
  }
}

function buildActivities(limit: number): DashboardView["activities"] {
  return listRecentAudit(limit).map((entry) => {
    const described = describeAuditEntry(entry);
    return { ...described, time: relativeTime(entry.occurredAt) };
  });
}

const FALLBACK_ACTIVITY = [{ title: "No activity yet", detail: "Actions will appear here as your team works", time: "", tag: "Info" }];

export function getDashboardForRole(role: SandboxRole): DashboardView {
  const orders = listOrders();
  const completedOrders = orders.filter((order) => order.status !== "cancelled");
  const revenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
  const pending = orders.filter((order) => order.status === "pending").length;
  const processing = orders.filter((order) => order.status === "processing").length;
  const shipped = orders.filter((order) => order.status === "shipped").length;
  const cancelled = orders.filter((order) => order.status === "cancelled").length;
  const inventoryMetrics = getInventoryMetrics();
  const lowStockLine = inventoryMetrics.find((metric) => metric.label === "Low stock lines");
  const unitsAvailableLine = inventoryMetrics.find((metric) => metric.label === "Units available");
  const activities = buildActivities(6);

  const { current: completedThisWeek, previous: completedLastWeek } = splitByRecency(completedOrders, (o) => o.createdAt, WEEK_MS);
  const revenueThisWeek = completedThisWeek.reduce((sum, o) => sum + o.total, 0);
  const revenueLastWeek = completedLastWeek.reduce((sum, o) => sum + o.total, 0);
  const revenueTrend = computeTrend(revenueThisWeek, revenueLastWeek, "up");

  if (role === "executive") {
    return {
      eyebrow: "Executive overview",
      title: "Here's where the business stands.",
      summary: `${orders.length} orders on record, ₦${(revenue / 1_000_000).toFixed(1)}M in booked revenue, and ${lowStockLine?.value ?? 0} lines running low.`,
      metrics: [
        { label: "Net revenue", value: `₦${(revenue / 1_000_000).toFixed(1)}M`, change: `${completedOrders.length} completed orders`, tone: "positive", trend: revenueTrend },
        { label: "Orders", value: String(orders.length), change: `${pending} awaiting confirmation`, tone: pending ? "warning" : "positive" },
        { label: "Inventory value", value: `₦${(getInventoryValue() / 1_000_000).toFixed(1)}M`, change: unitsAvailableLine?.change ?? "", tone: "neutral" },
        { label: "Cancelled orders", value: String(cancelled), change: cancelled ? "Review for patterns" : "None this period", tone: cancelled ? "warning" : "positive" },
      ],
      activityTitle: "Business pulse",
      activities: activities.length ? activities : FALLBACK_ACTIVITY,
      focusTitle: "Operational health",
      focusItems: [
        { label: "Orders in fulfilment", value: String(processing + shipped), note: `${processing} packing · ${shipped} shipped` },
        { label: "Low stock lines", value: String(lowStockLine?.value ?? "0"), note: "Reorder suggested" },
        { label: "Units in stock", value: String(unitsAvailableLine?.value ?? "0"), note: unitsAvailableLine?.change ?? "" },
      ],
    };
  }

  if (role === "sales_manager") {
    const avgOrderValue = completedOrders.length ? revenue / completedOrders.length : 0;
    return {
      eyebrow: "Sales workspace",
      title: "Orders, at a glance.",
      summary: `${pending} order${pending === 1 ? "" : "s"} need confirmation and ${processing} are moving through fulfilment.`,
      metrics: [
        { label: "Revenue booked", value: `₦${(revenue / 1_000_000).toFixed(1)}M`, change: `${completedOrders.length} orders`, tone: "positive", trend: revenueTrend },
        { label: "Awaiting confirmation", value: String(pending), change: pending ? "Needs action" : "All caught up", tone: pending ? "warning" : "positive" },
        { label: "In fulfilment", value: String(processing), change: `${shipped} already shipped`, tone: "neutral" },
        { label: "Avg. order value", value: `₦${Math.round(avgOrderValue).toLocaleString("en-NG")}`, change: "Across completed orders", tone: "neutral" },
      ],
      activityTitle: "Sales activity",
      activities: activities.length ? activities : FALLBACK_ACTIVITY,
      focusTitle: "Order pipeline",
      focusItems: [
        { label: "Pending", value: String(pending), note: "Confirm to start fulfilment" },
        { label: "Processing", value: String(processing), note: "With the warehouse" },
        { label: "Shipped", value: String(shipped), note: "In transit to customers" },
      ],
    };
  }

  if (role === "warehouse_manager") {
    return {
      eyebrow: "Warehouse operations",
      title: "Fulfilment queue.",
      summary: `${processing} order${processing === 1 ? "" : "s"} ready to pack, ${lowStockLine?.value ?? 0} line${lowStockLine?.value === "1" ? "" : "s"} running low.`,
      metrics: [
        { label: "Ready to pack", value: String(processing), change: `${pending} awaiting confirmation`, tone: processing ? "warning" : "positive", trend: computeTrend(completedThisWeek.length, completedLastWeek.length, "up") },
        { label: "In transit", value: String(shipped), change: "All carriers active", tone: "positive" },
        { label: "Low stock", value: String(lowStockLine?.value ?? "0"), change: "Reorder suggested", tone: Number(lowStockLine?.value ?? 0) ? "warning" : "positive" },
        { label: "Units available", value: String(unitsAvailableLine?.value ?? "0"), change: unitsAvailableLine?.change ?? "", tone: "neutral" },
      ],
      activityTitle: "Fulfilment activity",
      activities: activities.length ? activities : FALLBACK_ACTIVITY,
      focusTitle: "Stock attention",
      focusItems: inventoryMetrics.slice(1, 4).map((metric) => ({ label: metric.label, value: metric.value, note: metric.change })),
    };
  }

  // customer_support — no ticketing backend exists yet; kept illustrative.
  return {
    eyebrow: "Customer care",
    title: "Every conversation, in one place.",
    summary: "Four customers are waiting for a response. No urgent service issues are currently open.",
    metrics: [
      { label: "Open tickets", value: "9", change: "4 awaiting reply", tone: "warning" },
      { label: "Resolved today", value: "14", change: "+6 vs daily average", tone: "positive" },
      { label: "First response", value: "18m", change: "Within 30m target", tone: "positive" },
      { label: "Satisfaction", value: "4.8", change: "From 126 responses", tone: "neutral" },
    ],
    activityTitle: "Latest conversations",
    activities: [
      { title: "Sizing question received", detail: "Naha Veil Dress", time: "4 min", tag: "New" },
      { title: "Delivery update sent", detail: orders[0] ? `Order #${orders[0].orderNumber}` : "Recent order", time: "17 min", tag: "Replied" },
      { title: "Return request resolved", detail: "Exchange approved", time: "46 min", tag: "Resolved" },
    ],
    focusTitle: "Support health",
    focusItems: [
      { label: "Waiting on us", value: "4", note: "Oldest: 42 minutes" },
      { label: "Waiting on customer", value: "5", note: "Follow up tomorrow" },
      { label: "Resolved this week", value: "68", note: "91% within target" },
    ],
  };
}
