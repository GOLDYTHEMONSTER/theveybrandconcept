import { randomUUID } from "crypto";
import { recordAudit } from "../audit/sandbox-log";
import { listVariants } from "../catalog/store";
import { restockInventory } from "../inventory/store";
import { NotFoundError, ValidationError } from "../shared/errors";
import { createSeededRandom, stableId } from "../shared/seeded-random";
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

// Seeded so a cold start on a different serverless instance reproduces the
// same purchase orders (same ids, same statuses) -- see modules/shared/seeded-random.ts.
const seedRand = createSeededRandom("theveybrand-procurement-seed-v1");
function randomInt(min: number, max: number): number {
  return Math.floor(seedRand() * (max - min + 1)) + min;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(seedRand() * items.length)];
}

/**
 * Seeds a realistic spread of purchase orders across every status and
 * several weeks so the Procurement page (and its week-over-week "received"
 * trend) has real history on first load, instead of looking unused because
 * nobody has created a PO yet in this sandbox session.
 */
function seed(): PurchaseOrder[] {
  globalProcurement.__veyPoSeq = 0;
  const variants = listVariants();
  const rows: PurchaseOrder[] = [];
  const warehouses: Warehouse[] = ["Lagos showroom", "Guangzhou hub"];

  const PLAN: Array<{ status: PurchaseOrderStatus; createdDaysAgo: number }> = [
    { status: "received", createdDaysAgo: 28 },
    { status: "received", createdDaysAgo: 24 },
    { status: "received", createdDaysAgo: 19 },
    { status: "received", createdDaysAgo: 14 },
    { status: "ordered", createdDaysAgo: 9 },
    { status: "ordered", createdDaysAgo: 6 },
    { status: "ordered", createdDaysAgo: 3 },
    { status: "cancelled", createdDaysAgo: 17 },
    { status: "draft", createdDaysAgo: 1 },
    { status: "draft", createdDaysAgo: 0 },
  ];

  let index = 0;
  for (const plan of PLAN) {
    const variant = pick(variants);
    const warehouse = pick(warehouses);
    const quantity = randomInt(8, 30);
    const createdAt = ago(plan.createdDaysAgo);
    const leadDays = randomInt(7, 14);

    const order: PurchaseOrder = {
      id: stableId(`po-seed-${index++}`),
      poNumber: nextPoNumber(),
      variantId: variant.id,
      productId: variant.productId,
      productName: variant.productName,
      variantLabel: [variant.size, variant.color].filter(Boolean).join(" · ") || "Standard",
      sku: variant.sku,
      warehouse,
      supplier: SUPPLIER_BY_WAREHOUSE[warehouse],
      quantity,
      status: "draft",
      createdAt,
      updatedAt: createdAt,
      expectedDate: null,
      receivedAt: null,
      createdById: "sandbox-warehouse",
      createdByName: "David Chen",
    };

    recordAudit({ action: "procurement.create", entityType: "purchase_order", entityId: order.id, actorId: order.createdById, actorName: order.createdByName, afterValue: { poNumber: order.poNumber, sku: order.sku, quantity: order.quantity, warehouse: order.warehouse }, occurredAt: createdAt });

    if (plan.status !== "draft") {
      const orderedAt = Math.min(new Date(createdAt).getTime() + randomInt(4, 20) * 3600_000, Date.now());
      order.status = "ordered";
      order.expectedDate = new Date(orderedAt + leadDays * DAY_MS).toISOString();
      order.updatedAt = new Date(orderedAt).toISOString();
      recordAudit({ action: "procurement.order", entityType: "purchase_order", entityId: order.id, actorId: order.createdById, actorName: order.createdByName, afterValue: { status: "ordered", expectedDate: order.expectedDate }, occurredAt: order.updatedAt });

      if (plan.status === "received") {
        const receivedAt = Math.min(orderedAt + randomInt(2, plan.createdDaysAgo) * DAY_MS, Date.now());
        restockInventory({ variantId: variant.id, warehouse, quantity, reference: `PO-${order.poNumber}`, actorId: "sandbox-warehouse" });
        order.status = "received";
        order.receivedAt = new Date(receivedAt).toISOString();
        order.updatedAt = order.receivedAt;
        recordAudit({ action: "procurement.receive", entityType: "purchase_order", entityId: order.id, actorId: "sandbox-warehouse", actorName: "David Chen", afterValue: { status: "received", quantity, warehouse }, occurredAt: order.updatedAt });
      } else if (plan.status === "cancelled") {
        const cancelledAt = Math.min(orderedAt + randomInt(4, 20) * 3600_000, Date.now());
        order.status = "cancelled";
        order.updatedAt = new Date(cancelledAt).toISOString();
        recordAudit({ action: "procurement.cancel", entityType: "purchase_order", entityId: order.id, actorId: order.createdById, actorName: order.createdByName, afterValue: { status: "cancelled" }, occurredAt: order.updatedAt });
      }
    }

    rows.push(order);
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
    productId: variant.productId,
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
