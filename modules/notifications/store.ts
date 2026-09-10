import { randomUUID } from "crypto";
import type { SandboxRole } from "../authentication/domain";
import { listOrders } from "../orders/store";
import { listReturns } from "../returns/store";
import { listPurchaseOrders } from "../procurement/store";
import { stableId } from "../shared/seeded-random";
import type { NotificationRecord, NotificationType, NotificationView } from "./domain";

const ORGANIZATION_ID = "theveybrand-sandbox";

const globalNotifications = globalThis as typeof globalThis & { __veyNotifications?: NotificationRecord[] };

/**
 * Backfills a handful of notifications from the most recent real events
 * across orders, returns and procurement (all already seeded by the time
 * this runs, since importing their stores above triggers their own seeding
 * first) -- so the bell has real, clickable history on first login instead
 * of being empty until someone happens to trigger a live event.
 */
function seedNotifications(): NotificationRecord[] {
  const records: NotificationRecord[] = [];

  const recentDelivered = listOrders()
    .filter((order) => order.status === "delivered")
    .slice(0, 4);
  for (const order of recentDelivered) {
    records.push({
      id: stableId(`notification-seed-order-${order.id}`),
      organizationId: ORGANIZATION_ID,
      audienceRoles: ["executive", "sales_manager"],
      type: "order.delivered",
      title: "Order delivered",
      message: `Order #${order.orderNumber} was delivered`,
      href: `/orders/${order.id}`,
      readBy: [],
      createdAt: order.createdAt,
    });
  }

  const recentReturns = listReturns()
    .filter((request) => request.status === "requested")
    .slice(0, 3);
  for (const request of recentReturns) {
    records.push({
      id: stableId(`notification-seed-return-${request.id}`),
      organizationId: ORGANIZATION_ID,
      audienceRoles: ["executive", "sales_manager", "customer_support"],
      type: "return.requested",
      title: "Return requested",
      message: `${request.customer} requested a return — ${request.returnNumber}`,
      href: `/returns/${request.id}`,
      readBy: [],
      createdAt: request.createdAt,
    });
  }

  const recentPOs = listPurchaseOrders()
    .filter((po) => po.status === "received" && po.receivedAt)
    .slice(0, 2);
  for (const po of recentPOs) {
    records.push({
      id: stableId(`notification-seed-po-${po.id}`),
      organizationId: ORGANIZATION_ID,
      audienceRoles: ["executive", "warehouse_manager"],
      type: "procurement.received",
      title: "Purchase order received",
      message: `${po.quantity} × ${po.productName} received into ${po.warehouse} (PO-${po.poNumber})`,
      href: `/inventory/product/${po.productId}`,
      readBy: [],
      createdAt: po.receivedAt!,
    });
  }

  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

if (!globalNotifications.__veyNotifications) {
  globalNotifications.__veyNotifications = seedNotifications();
}

function store(): NotificationRecord[] {
  return globalNotifications.__veyNotifications!;
}

/** `createdAt` may be passed explicitly when backfilling seed data; omit it for a live event and it's simply now. */
export function createNotification(input: {
  audienceRoles: SandboxRole[];
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
  createdAt?: string;
}): NotificationRecord {
  const record: NotificationRecord = {
    id: randomUUID(),
    organizationId: ORGANIZATION_ID,
    audienceRoles: input.audienceRoles,
    type: input.type,
    title: input.title,
    message: input.message,
    href: input.href ?? null,
    readBy: [],
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  store().unshift(record);
  if (store().length > 300) store().length = 300;
  return record;
}

export function listNotificationsForUser(role: SandboxRole, userId: string, limit = 30): NotificationView[] {
  return store()
    .filter((record) => record.audienceRoles.includes(role))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((record) => ({ ...record, read: record.readBy.includes(userId) }));
}

export function getUnreadCount(role: SandboxRole, userId: string): number {
  return store().filter((record) => record.audienceRoles.includes(role) && !record.readBy.includes(userId)).length;
}

export function markNotificationRead(id: string, userId: string): boolean {
  const record = store().find((item) => item.id === id);
  if (!record) return false;
  if (!record.readBy.includes(userId)) record.readBy.push(userId);
  return true;
}

export function markAllRead(role: SandboxRole, userId: string): void {
  for (const record of store()) {
    if (record.audienceRoles.includes(role) && !record.readBy.includes(userId)) {
      record.readBy.push(userId);
    }
  }
}
