import type { SandboxRole } from "../authentication/domain";
import { getAbandonedCheckouts, listOrders } from "../orders/store";
import { getInventoryMetrics, getInventoryValue } from "../inventory/service";
import { listRecentAudit, type SandboxAuditEntry } from "../audit/sandbox-log";
import { computeTrend, splitByRecency, WEEK_MS, type Trend } from "../shared/trend";
import { getAttendanceMetrics } from "../attendance/service";
import { listAttendance } from "../attendance/store";
import { listTeamMembers } from "../team/store";
import { listTasks } from "../tasks/store";
import { getCrmMetrics } from "../crm/service";
import { getReturnMetrics, RETURN_REASON_LABEL } from "../returns/service";
import { listReturns } from "../returns/store";
import { getProcurementMetrics, getReorderSuggestions } from "../procurement/service";

export interface DashboardMetric {
  label: string;
  value: string;
  change: string;
  tone?: "positive" | "warning" | "neutral";
  trend?: Trend;
  href?: string;
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
  focusHref?: string;
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
    case "attendance.clock_in":
      return { title: "Clocked in", detail: entry.actorName, tag: "Attendance" };
    case "attendance.clock_out": {
      const minutes = Number(after.durationMinutes ?? 0);
      return { title: "Clocked out", detail: `${entry.actorName} · ${Math.floor(minutes / 60)}h ${minutes % 60}m`, tag: "Attendance" };
    }
    case "tasks.create":
      return { title: `Task assigned: ${String(after.title ?? "")}`, detail: `by ${entry.actorName}`, tag: "Task" };
    case "tasks.status_change":
      return { title: `Task marked ${String(after.status ?? "").replace("_", " ")}`, detail: entry.actorName, tag: "Task" };
    case "procurement.create":
      return { title: `PO-${after.poNumber ?? "—"} drafted`, detail: `${after.quantity ?? ""} × ${after.sku ?? ""}`, tag: "Procurement" };
    case "procurement.order":
      return { title: "Purchase order placed", detail: entry.actorName, tag: "Procurement" };
    case "procurement.receive":
      return { title: "Purchase order received", detail: `${after.quantity ?? ""} units into ${after.warehouse ?? ""}`, tag: "Procurement" };
    case "returns.create":
      return { title: `Return requested: ${after.returnNumber ?? "—"}`, detail: `₦${Number(after.refundAmount ?? 0).toLocaleString("en-NG")} · ${String(after.reason ?? "").replace(/_/g, " ")}`, tag: "Return" };
    case "returns.approve":
      return { title: "Return approved", detail: entry.actorName, tag: "Return" };
    case "returns.reject":
      return { title: "Return rejected", detail: entry.reason ?? entry.actorName, tag: "Return" };
    case "returns.receive":
      return { title: "Return received back into stock", detail: entry.actorName, tag: "Return" };
    case "returns.refund":
      return { title: "Return refunded", detail: entry.actorName, tag: "Return" };
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
    const pendingReturns = getReturnMetrics()[0];
    return {
      eyebrow: "Executive overview",
      title: "Here's where the business stands.",
      summary: `${orders.length} orders on record, ₦${(revenue / 1_000_000).toFixed(1)}M in booked revenue, and ${lowStockLine?.value ?? 0} lines running low.`,
      metrics: [
        { label: "Net revenue", value: `₦${(revenue / 1_000_000).toFixed(1)}M`, change: `${completedOrders.length} completed orders`, tone: "positive", trend: revenueTrend, href: "/orders" },
        { label: "Orders", value: String(orders.length), change: `${pending} awaiting confirmation`, tone: pending ? "warning" : "positive", href: "/orders?status=pending" },
        { label: "Inventory value", value: `₦${(getInventoryValue() / 1_000_000).toFixed(1)}M`, change: unitsAvailableLine?.change ?? "", tone: "neutral", href: "/inventory" },
        { label: "Cancelled orders", value: String(cancelled), change: cancelled ? "Review for patterns" : "None this period", tone: cancelled ? "warning" : "positive", href: "/orders?status=cancelled" },
        { label: "Returns awaiting review", value: pendingReturns.value, change: pendingReturns.change, tone: pendingReturns.tone, trend: pendingReturns.trend, href: "/returns?status=requested" },
      ],
      activityTitle: "Business pulse",
      activities: activities.length ? activities : FALLBACK_ACTIVITY,
      focusTitle: "Operational health",
      focusItems: [
        { label: "Orders in fulfilment", value: String(processing + shipped), note: `${processing} packing · ${shipped} shipped` },
        { label: "Low stock lines", value: String(lowStockLine?.value ?? "0"), note: "Reorder suggested" },
        { label: "Units in stock", value: String(unitsAvailableLine?.value ?? "0"), note: unitsAvailableLine?.change ?? "" },
      ],
      focusHref: "/inventory",
    };
  }

  if (role === "sales_manager") {
    const avgOrderValue = completedOrders.length ? revenue / completedOrders.length : 0;
    const abandoned = getAbandonedCheckouts();
    const abandonedValue = abandoned.reduce((sum, order) => sum + order.total, 0);
    return {
      eyebrow: "Sales workspace",
      title: "Orders, at a glance.",
      summary: `${pending} order${pending === 1 ? "" : "s"} need confirmation and ${processing} are moving through fulfilment.`,
      metrics: [
        { label: "Revenue booked", value: `₦${(revenue / 1_000_000).toFixed(1)}M`, change: `${completedOrders.length} orders`, tone: "positive", trend: revenueTrend, href: "/orders" },
        { label: "Awaiting confirmation", value: String(pending), change: pending ? "Needs action" : "All caught up", tone: pending ? "warning" : "positive", href: "/orders?status=pending" },
        { label: "In fulfilment", value: String(processing), change: `${shipped} already shipped`, tone: "neutral", href: "/orders?status=processing" },
        { label: "Avg. order value", value: `₦${Math.round(avgOrderValue).toLocaleString("en-NG")}`, change: "Across completed orders", tone: "neutral", href: "/orders" },
      ],
      activityTitle: "Sales activity",
      activities: activities.length ? activities : FALLBACK_ACTIVITY,
      focusTitle: "Order pipeline",
      focusItems: [
        { label: "Pending", value: String(pending), note: "Confirm to start fulfilment" },
        { label: "Processing", value: String(processing), note: "With the warehouse" },
        { label: "Shipped", value: String(shipped), note: "In transit to customers" },
        {
          label: "Abandoned checkouts",
          value: String(abandoned.length),
          note: abandoned.length ? `₦${(abandonedValue / 1000).toFixed(0)}k at risk — see Recovery` : "None right now",
        },
      ],
      focusHref: "/recovery",
    };
  }

  if (role === "warehouse_manager") {
    const openPurchaseOrders = getProcurementMetrics()[0];
    const reorderSuggestions = getReorderSuggestions();
    return {
      eyebrow: "Warehouse operations",
      title: "Fulfilment queue.",
      summary: `${processing} order${processing === 1 ? "" : "s"} ready to pack, ${lowStockLine?.value ?? 0} line${lowStockLine?.value === "1" ? "" : "s"} running low.`,
      metrics: [
        { label: "Ready to pack", value: String(processing), change: `${pending} awaiting confirmation`, tone: processing ? "warning" : "positive", trend: computeTrend(completedThisWeek.length, completedLastWeek.length, "up"), href: "/orders?status=processing" },
        { label: "In transit", value: String(shipped), change: "All carriers active", tone: "positive", href: "/orders?status=shipped" },
        { label: "Low stock", value: String(lowStockLine?.value ?? "0"), change: "Reorder suggested", tone: Number(lowStockLine?.value ?? 0) ? "warning" : "positive", href: "/inventory" },
        { label: "Open purchase orders", value: openPurchaseOrders.value, change: openPurchaseOrders.change, tone: openPurchaseOrders.tone, href: "/procurement" },
      ],
      activityTitle: "Fulfilment activity",
      activities: activities.length ? activities : FALLBACK_ACTIVITY,
      focusTitle: "Reorder suggestions",
      focusItems: reorderSuggestions.length
        ? reorderSuggestions.slice(0, 3).map((suggestion) => ({ label: suggestion.productName, value: `${suggestion.onHand} left`, note: `${suggestion.warehouse} · suggest ${suggestion.suggestedQuantity} from ${suggestion.supplier}` }))
        : [{ label: "Nothing to reorder", value: "—", note: "Every line is above its reorder point" }],
      focusHref: "/procurement",
    };
  }

  if (role === "hr_manager") {
    const attendanceMetrics = getAttendanceMetrics();
    const clockedInNow = attendanceMetrics.find((metric) => metric.label === "Clocked in now");
    const lateArrivals = attendanceMetrics.find((metric) => metric.label === "Late arrivals");
    const team = listTeamMembers();
    const suspended = team.filter((member) => member.status === "suspended").length;
    const tasks = listTasks();
    const openTasks = tasks.filter((task) => task.status === "todo" || task.status === "in_progress");
    const overdueTasks = openTasks.filter((task) => task.dueDate && new Date(task.dueDate).getTime() < Date.now());
    const { current: attendanceThisWeek, previous: attendanceLastWeek } = splitByRecency(
      listAttendance().filter((record) => record.clockOut !== null),
      (record) => record.clockIn,
      WEEK_MS
    );

    return {
      eyebrow: "People operations",
      title: "Your team, at a glance.",
      summary: `${team.length} teammate${team.length === 1 ? "" : "s"} on the roster, ${clockedInNow?.value ?? 0} clocked in right now, and ${openTasks.length} task${openTasks.length === 1 ? "" : "s"} in progress.`,
      metrics: [
        { label: "Team members", value: String(team.length), change: suspended ? `${suspended} suspended` : "All active", tone: suspended ? "warning" : "positive", href: "/team" },
        { label: "Clocked in now", value: String(clockedInNow?.value ?? "0"), change: clockedInNow?.change ?? "", tone: clockedInNow?.tone, href: "/attendance" },
        { label: "Late arrivals", value: String(lateArrivals?.value ?? "0"), change: "This week vs last", tone: lateArrivals?.tone, trend: computeTrend(attendanceThisWeek.length, attendanceLastWeek.length, "up"), href: "/attendance" },
        { label: "Overdue tasks", value: String(overdueTasks.length), change: overdueTasks.length ? "Needs follow-up" : "Nothing overdue", tone: overdueTasks.length ? "warning" : "positive", href: "/tasks" },
      ],
      activityTitle: "People activity",
      activities: activities.length ? activities : FALLBACK_ACTIVITY,
      focusTitle: "Open tasks",
      focusItems: openTasks.length
        ? openTasks.slice(0, 3).map((task) => ({ label: task.title, value: task.assigneeName, note: task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString("en-NG", { dateStyle: "medium" })}` : "No due date" }))
        : [{ label: "Nothing open", value: "—", note: "No tasks currently in progress" }],
      focusHref: "/tasks",
    };
  }

  // customer_support — there's no ticketing backend yet, so this pulls from
  // the real data support staff actually have access to (returns, orders,
  // customers) instead of the illustrative ticket/CSAT numbers it used to
  // hardcode, which never matched anything a click could take you to.
  const pendingReturns = getReturnMetrics()[0];
  const crmMetrics = getCrmMetrics();
  const activeCustomers = crmMetrics[0];
  const vipAccounts = crmMetrics[1];
  const openOrders = orders.filter((order) => order.status === "pending" || order.status === "processing").length;
  const returnsNeedingReview = listReturns()
    .filter((request) => request.status === "requested")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return {
    eyebrow: "Customer care",
    title: "Every customer, in view.",
    summary: `${pendingReturns.value} return${pendingReturns.value === "1" ? "" : "s"} need a decision and ${openOrders} order${openOrders === 1 ? "" : "s"} are still moving through fulfilment.`,
    metrics: [
      { label: "Returns awaiting review", value: pendingReturns.value, change: pendingReturns.change, tone: pendingReturns.tone, trend: pendingReturns.trend, href: "/returns?status=requested" },
      { label: "Orders in progress", value: String(openOrders), change: "Pending or processing", tone: openOrders ? "warning" : "positive", href: "/orders" },
      { label: "Active customers", value: activeCustomers.value, change: activeCustomers.change, tone: activeCustomers.tone, href: "/customers" },
      { label: "VIP accounts", value: vipAccounts.value, change: vipAccounts.change, tone: vipAccounts.tone, href: "/customers" },
    ],
    activityTitle: "Recent activity",
    activities: activities.length ? activities : FALLBACK_ACTIVITY,
    focusTitle: "Returns needing a decision",
    focusItems: returnsNeedingReview.length
      ? returnsNeedingReview.slice(0, 3).map((request) => {
          const age = relativeTime(request.createdAt);
          return {
            label: `${request.returnNumber} · ${request.customer}`,
            value: RETURN_REASON_LABEL[request.reason],
            note: age === "just now" ? "Requested just now" : `Requested ${age} ago`,
          };
        })
      : [{ label: "Nothing needs review", value: "—", note: "All return requests are up to date" }],
    focusHref: "/returns?status=requested",
  };
}
