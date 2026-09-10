import { randomUUID } from "crypto";
import { listVariants } from "../catalog/store";
import { restockInventory } from "../inventory/store";
import { NotFoundError, ValidationError } from "../shared/errors";
import type { Warehouse } from "../shared/warehouses";
import type { PurchaseOrder, PurchaseOrderStatus } from "./domain";

export type { PurchaseOrder, PurchaseOrderStatus } from "./domain";

export const SUPPLIER_BY_WAREHOUSE: Record<Warehouse, string> = {
  "Lagos showroom": "Lagos Textile Co.",
  "Guangzhou hub": "Guangzhou Atelier Partners",
};

const globalProcurement = globalThis as typeof globalThis & { __veyPurchaseOrders?: PurchaseOrder[]; __veyPoSeq?: number };

const DAY_MS = 24 * 60 * 60 * 1000;
function ago(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}
function inDays(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

function nextPoNumber(): number {
  globalProcurement.__veyPoSeq = (globalProcurement.__veyPoSeq ?? 0) + 1;
  return globalProcurement.__veyPoSeq;
}

/**
 * Seeds one purchase order already in transit and one already received so
 * the Procurement page (and its week-over-week "received" trend) has real
 * history on first load, instead of looking unused because nobody has
 * created a PO yet in this sandbox session.
 */
function seed(): PurchaseOrder[] {
  globalProcurement.__veyPoSeq = 0;
  const variants = listVariants();
  const rows: PurchaseOrder[] = [];

  const first = variants[0];
  if (first) {
    rows.push({
      id: randomUUID(),
      poNumber: nextPoNumber(),
      variantId: first.id,
      productName: first.productName,
      variantLabel: [first.size, first.color].filter(Boolean).join(" · ") || "Standard",
      sku: first.sku,
      warehouse: "Guangzhou hub",
      supplier: SUPPLIER_BY_WAREHOUSE["Guangzhou hub"],
      quantity: 24,
      status: "ordered",
      createdAt: ago(4),
      updatedAt: ago(4),
      expectedDate: inDays(6),
      receivedAt: null,
      createdById: "sandbox-warehouse",
      createdByName: "David Chen",
    });
  }

  const second = variants[1];
  if (second) {
    rows.push({
      id: randomUUID(),
      poNumber: nextPoNumber(),
      variantId: second.id,
      productName: second.productName,
      variantLabel: [second.size, second.color].filter(Boolean).join(" · ") || "Standard",
      sku: second.sku,
      warehouse: "Lagos showroom",
      supplier: SUPPLIER_BY_WAREHOUSE["Lagos showroom"],
      quantity: 15,
      status: "received",
      createdAt: ago(11),
      updatedAt: ago(9),
      expectedDate: ago(9),
      receivedAt: ago(9),
      createdById: "sandbox-warehouse",
      createdByName: "David Chen",
    });
  }

  return rows;
}

if (!globalProcurement.__veyPurchaseOrders) {
  globalProcurement.__veyPurchaseOrders = seed();
}

function store(): PurchaseOrder[] {
  return globalProcurement.__veyPurchaseOrders!;
}

export function listPurchaseOrders(): PurchaseOrder[] {
  return [...store()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getPurchaseOrder(id: string): PurchaseOrder {
  const order = store().find((row) => row.id === id);
  if (!order) throw new NotFoundError("Purchase order not found");
  return order;
}

export function createPurchaseOrder(input: {
  variantId: string;
  warehouse: Warehouse;
  quantity: number;
  createdById: string;
  createdByName: string;
}): PurchaseOrder {
  if (input.quantity < 1 || input.quantity > 1000) throw new ValidationError("Quantity must be between 1 and 1000");
  const variant = listVariants().find((row) => row.id === input.variantId);
  if (!variant) throw new NotFoundError("Product variant not found");

  const now = new Date().toISOString();
  const order: PurchaseOrder = {
    id: randomUUID(),
    poNumber: nextPoNumber(),
    variantId: variant.id,
    productName: variant.productName,
    variantLabel: [variant.size, variant.color].filter(Boolean).join(" · ") || "Standard",
    sku: variant.sku,
    warehouse: input.warehouse,
    supplier: SUPPLIER_BY_WAREHOUSE[input.warehouse],
    quantity: input.quantity,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    expectedDate: null,
    receivedAt: null,
    createdById: input.createdById,
    createdByName: input.createdByName,
  };
  store().push(order);
  return order;
}

export function markOrdered(id: string, leadDays = 10): PurchaseOrder {
  const order = getPurchaseOrder(id);
  if (order.status !== "draft") throw new ValidationError(`Cannot mark a "${order.status}" purchase order as ordered`);
  order.status = "ordered";
  order.expectedDate = inDays(leadDays);
  order.updatedAt = new Date().toISOString();
  return order;
}

export function receivePurchaseOrder(id: string, actorId: string): PurchaseOrder {
  const order = getPurchaseOrder(id);
  if (order.status !== "ordered") throw new ValidationError(`Cannot receive a "${order.status}" purchase order`);

  restockInventory({
    variantId: order.variantId,
    warehouse: order.warehouse,
    quantity: order.quantity,
    reference: `PO-${order.poNumber}`,
    actorId,
  });

  order.status = "received";
  order.receivedAt = new Date().toISOString();
  order.updatedAt = order.receivedAt;
  return order;
}

export function cancelPurchaseOrder(id: string): PurchaseOrder {
  const order = getPurchaseOrder(id);
  if (order.status === "received") throw new ValidationError("Cannot cancel a purchase order that's already been received");
  order.status = "cancelled";
  order.updatedAt = new Date().toISOString();
  return order;
}
