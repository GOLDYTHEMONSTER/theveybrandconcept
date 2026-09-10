import { getInventoryRows } from "../inventory/service";
import { computeTrend, splitByRecency, WEEK_MS } from "../shared/trend";
import type { MetricCardData } from "../../app/(erp)/_components/MetricGrid";
import { listPurchaseOrders, SUPPLIER_BY_WAREHOUSE, type PurchaseOrder, type PurchaseOrderStatus } from "./store";

export interface ReorderSuggestion {
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  warehouse: string;
  onHand: number;
  reorderPoint: number;
  suggestedQuantity: number;
  supplier: string;
}

export const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  ordered: "Ordered",
  received: "Received",
  cancelled: "Cancelled",
};

export const STATUS_TONE: Record<PurchaseOrderStatus, string> = {
  draft: "neutral",
  ordered: "warning",
  received: "positive",
  cancelled: "negative",
};

export interface PurchaseOrderRow {
  id: string;
  poNumber: number;
  productName: string;
  variantLabel: string;
  sku: string;
  warehouse: string;
  supplier: string;
  quantity: number;
  status: PurchaseOrderStatus;
  statusLabel: string;
  statusTone: string;
  expectedDateLabel: string | null;
  createdByName: string;
}

/** Lines already low/out of stock with no open (draft or ordered) PO covering them yet. */
export function getReorderSuggestions(): ReorderSuggestion[] {
  const rows = getInventoryRows().filter((row) => row.status === "low_stock" || row.status === "out_of_stock");
  const openVariantIds = new Set(
    listPurchaseOrders()
      .filter((po) => po.status === "draft" || po.status === "ordered")
      .map((po) => po.variantId)
  );

  return rows
    .filter((row) => !openVariantIds.has(row.variantId))
    .map((row) => ({
      variantId: row.variantId,
      productName: row.product,
      variantLabel: row.variant,
      sku: row.sku,
      warehouse: row.warehouse,
      onHand: row.onHand,
      reorderPoint: row.reorderPoint,
      suggestedQuantity: Math.max(row.reorderPoint * 2 - row.onHand, row.reorderPoint),
      supplier: SUPPLIER_BY_WAREHOUSE[row.warehouse as keyof typeof SUPPLIER_BY_WAREHOUSE] ?? "Primary supplier",
    }));
}

function toRow(order: PurchaseOrder): PurchaseOrderRow {
  return {
    id: order.id,
    poNumber: order.poNumber,
    productName: order.productName,
    variantLabel: order.variantLabel,
    sku: order.sku,
    warehouse: order.warehouse,
    supplier: order.supplier,
    quantity: order.quantity,
    status: order.status,
    statusLabel: STATUS_LABEL[order.status],
    statusTone: STATUS_TONE[order.status],
    expectedDateLabel: order.expectedDate ? new Date(order.expectedDate).toLocaleDateString("en-NG", { dateStyle: "medium" }) : null,
    createdByName: order.createdByName,
  };
}

export function getPurchaseOrderRows(): PurchaseOrderRow[] {
  return listPurchaseOrders().map(toRow);
}

export function getProcurementMetrics(): MetricCardData[] {
  const orders = listPurchaseOrders();
  const open = orders.filter((order) => order.status === "draft" || order.status === "ordered");
  const unitsIncoming = open.reduce((sum, order) => sum + order.quantity, 0);
  const received = orders.filter((order) => order.status === "received" && order.receivedAt);

  const { current, previous } = splitByRecency(received, (order) => order.receivedAt!, WEEK_MS);
  const receivedTrend = computeTrend(current.length, previous.length, "up");

  return [
    { label: "Open purchase orders", value: String(open.length), change: `${unitsIncoming} unit${unitsIncoming === 1 ? "" : "s"} incoming`, tone: "neutral" },
    { label: "Reorder suggestions", value: String(getReorderSuggestions().length), change: "Low or out of stock lines", tone: getReorderSuggestions().length ? "warning" : "positive" },
    { label: "Received this week", value: String(current.length), change: "This week vs last", tone: "positive", trend: receivedTrend },
    { label: "Suppliers", value: String(new Set(orders.map((order) => order.supplier)).size || Object.keys(SUPPLIER_BY_WAREHOUSE).length), change: "Active sourcing partners", tone: "neutral" },
  ];
}
