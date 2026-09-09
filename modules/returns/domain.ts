export const RETURN_STATUSES = ["requested", "approved", "rejected", "received", "refunded"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_REASONS = ["wrong_size", "damaged", "not_as_described", "changed_mind", "other"] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

export interface ReturnItem {
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  warehouse: string;
}

export interface ReturnEvent {
  id: string;
  fromStatus: ReturnStatus | null;
  toStatus: ReturnStatus;
  actorId: string;
  actorName: string;
  note: string | null;
  occurredAt: string;
}

export interface ReturnRequest {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  customer: string;
  reason: ReturnReason;
  reasonNote: string | null;
  items: ReturnItem[];
  refundAmount: number;
  status: ReturnStatus;
  createdBy: string;
  createdAt: string;
  events: ReturnEvent[];
  refundId: string | null;
}

export interface CreateReturnItemInput {
  variantId: string;
  quantity: number;
}

export interface CreateReturnInput {
  orderId: string;
  items: CreateReturnItemInput[];
  reason: ReturnReason;
  reasonNote: string | null;
}
