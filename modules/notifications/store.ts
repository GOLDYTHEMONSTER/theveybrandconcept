import { randomUUID } from "crypto";
import type { SandboxRole } from "../authentication/domain";
import type { NotificationRecord, NotificationType, NotificationView } from "./domain";

const ORGANIZATION_ID = "theveybrand-sandbox";

const globalNotifications = globalThis as typeof globalThis & { __veyNotifications?: NotificationRecord[] };
if (!globalNotifications.__veyNotifications) {
  globalNotifications.__veyNotifications = [];
}

function store(): NotificationRecord[] {
  return globalNotifications.__veyNotifications!;
}

export function createNotification(input: {
  audienceRoles: SandboxRole[];
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
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
    createdAt: new Date().toISOString(),
  };
  store().unshift(record);
  if (store().length > 300) store().length = 300;
  return record;
}

export function listNotificationsForUser(role: SandboxRole, userId: string, limit = 30): NotificationView[] {
  return store()
    .filter((record) => record.audienceRoles.includes(role))
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
