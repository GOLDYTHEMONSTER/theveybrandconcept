import type { Warehouse } from "../shared/warehouses";

export type PurchaseOrderStatus = "draft" | "ordered" | "received" | "cancelled";

export interface PurchaseOrder {
  id: string;
  poNumber: number;
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  warehouse: Warehouse;
  supplier: string;
  quantity: number;
  status: PurchaseOrderStatus;
  createdAt: string;
  updatedAt: string;
  expectedDate: string | null;
  receivedAt: string | null;
  createdById: string;
  createdByName: string;
}
