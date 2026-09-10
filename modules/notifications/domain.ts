import type { SandboxRole } from "../authentication/domain";

export type NotificationType =
  | "order.created"
  | "order.shipped"
  | "order.cancelled"
  | "inventory.low_stock"
  | "inventory.out_of_stock"
  | "product.created"
  | "storefront.order"
  | "team.invited"
  | "return.requested"
  | "return.approved"
  | "return.rejected"
  | "return.received"
  | "return.refunded"
  | "attendance.clock_in"
  | "attendance.late"
  | "task.assigned"
  | "task.completed"
  | "order.processing"
  | "order.delivered"
  | "procurement.ordered"
  | "procurement.received"
  | "onboarding.started"
  | "onboarding.completed"
  | "offboarding.started"
  | "offboarding.completed";

export interface NotificationRecord {
  id: string;
  organizationId: string;
  audienceRoles: SandboxRole[];
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  readBy: string[];
  createdAt: string;
}

export interface NotificationView extends NotificationRecord {
  read: boolean;
}
