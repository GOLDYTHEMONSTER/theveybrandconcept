import { randomUUID } from "crypto";
import { ValidationError } from "../shared/errors";
import { InsufficientStockError } from "../shared/errors";
import { WAREHOUSES, type Warehouse } from "../shared/warehouses";
import { listVariants } from "../catalog/store";

export type LedgerBucket = "on_hand" | "reserved";
export type LedgerType = "initial" | "adjustment" | "reservation" | "release" | "fulfilled" | "restock";

export interface LedgerEntry {
  id: string;
  variantId: string;
  warehouse: Warehouse;
  bucket: LedgerBucket;
  quantity: number; // signed delta
  type: LedgerType;
  reason: string | null;
  reference: string | null;
  actorId: string;
  occurredAt: string;
}

const REORDER_POINTS: Record<string, number> = {
  "VY-NVD-S-CH": 5,
  "VY-BSD-M-NS": 8,
  "VY-OMG-L-ON": 5,
  "VY-SWG-M-IV": 6,
};
const DEFAULT_REORDER_POINT = 6;

const INITIAL_STOCK: Record<string, { warehouse: Warehouse; onHand: number }> = {
  "VY-NVD-S-CH": { warehouse: "Lagos showroom", onHand: 3 },
  "VY-NVD-M-CH": { warehouse: "Lagos showroom", onHand: 14 },
  "VY-BSD-M-NS": { warehouse: "Lagos showroom", onHand: 4 },
  "VY-BSD-L-NS": { warehouse: "Guangzhou hub", onHand: 48 },
  "VY-OMG-L-ON": { warehouse: "Lagos showroom", onHand: 0 },
  "VY-OMG-M-ON": { warehouse: "Guangzhou hub", onHand: 22 },
  "VY-SWG-S-IV": { warehouse: "Lagos showroom", onHand: 9 },
  "VY-SWG-M-IV": { warehouse: "Lagos showroom", onHand: 2 },
  "VY-MOH-M-WH": { warehouse: "Lagos showroom", onHand: 8 },
  "VY-COC-M-BR": { warehouse: "Lagos showroom", onHand: 1 },
  "VY-SIENNA-GOWN": { warehouse: "Lagos showroom", onHand: 6 },
  "VY-ATELIER-SET": { warehouse: "Guangzhou hub", onHand: 14 },
  "VY-NOIR-MINI": { warehouse: "Lagos showroom", onHand: 0 },
  "VY-VELVET-SHIFT": { warehouse: "Lagos showroom", onHand: 20 },
};

function seedLedger(): LedgerEntry[] {
  const now = new Date().toISOString();
  return listVariants()
    .map((variant) => {
      const seed = INITIAL_STOCK[variant.sku];
      if (!seed) return null;
      const entry: LedgerEntry = {
        id: randomUUID(),
        variantId: variant.id,
        warehouse: seed.warehouse,
        bucket: "on_hand",
        quantity: seed.onHand,
        type: "initial",
        reason: "Opening stock",
        reference: null,
        actorId: "sandbox-executive",
        occurredAt: now,
      };
      return entry;
    })
    .filter((entry): entry is LedgerEntry => entry !== null);
}

const globalLedger = globalThis as typeof globalThis & { __veyLedger?: LedgerEntry[] };
if (!globalLedger.__veyLedger) {
  globalLedger.__veyLedger = seedLedger();
}

function ledger(): LedgerEntry[] {
  return globalLedger.__veyLedger!;
}

function append(entry: Omit<LedgerEntry, "id" | "occurredAt">): LedgerEntry {
  const full: LedgerEntry = { ...entry, id: randomUUID(), occurredAt: new Date().toISOString() };
  ledger().push(full);
  return full;
}

export function getReorderPoint(sku: string): number {
  return REORDER_POINTS[sku] ?? DEFAULT_REORDER_POINT;
}

export interface StockSummary {
  warehouse: Warehouse;
  onHand: number;
  reserved: number;
  available: number;
}

export function getStockByWarehouse(variantId: string): StockSummary[] {
  return WAREHOUSES.map((warehouse) => {
    const entries = ledger().filter((entry) => entry.variantId === variantId && entry.warehouse === warehouse);
    const onHand = entries.filter((e) => e.bucket === "on_hand").reduce((sum, e) => sum + e.quantity, 0);
    const reserved = entries.filter((e) => e.bucket === "reserved").reduce((sum, e) => sum + e.quantity, 0);
    return { warehouse, onHand, reserved, available: onHand - reserved };
  });
}

/** Warehouses this variant has ever had ledger activity in — including a zero-quantity opening entry. */
export function getAssignedWarehouses(variantId: string): Warehouse[] {
  return WAREHOUSES.filter((warehouse) => ledger().some((entry) => entry.variantId === variantId && entry.warehouse === warehouse));
}

export function getStockTotals(variantId: string): { onHand: number; reserved: number; available: number } {
  return getStockByWarehouse(variantId).reduce(
    (totals, row) => ({
      onHand: totals.onHand + row.onHand,
      reserved: totals.reserved + row.reserved,
      available: totals.available + row.available,
    }),
    { onHand: 0, reserved: 0, available: 0 }
  );
}

export function adjustStock(params: {
  variantId: string;
  warehouse: Warehouse;
  quantityDelta: number;
  reason: string;
  actorId: string;
}): LedgerEntry {
  const current = getStockByWarehouse(params.variantId).find((row) => row.warehouse === params.warehouse);
  if (current && current.onHand + params.quantityDelta < 0) {
    throw new ValidationError(`Adjustment would take on-hand stock below zero (currently ${current.onHand})`);
  }
  return append({
    variantId: params.variantId,
    warehouse: params.warehouse,
    bucket: "on_hand",
    quantity: params.quantityDelta,
    type: "adjustment",
    reason: params.reason,
    reference: null,
    actorId: params.actorId,
  });
}

/** Picks the first warehouse with enough available stock to cover the request. */
export function reserveStock(params: {
  variantId: string;
  quantity: number;
  reference: string;
  actorId: string;
}): Warehouse {
  const byWarehouse = getStockByWarehouse(params.variantId);
  const target = byWarehouse.find((row) => row.available >= params.quantity);
  if (!target) {
    const totalAvailable = byWarehouse.reduce((sum, row) => sum + Math.max(0, row.available), 0);
    throw new InsufficientStockError(
      `Only ${totalAvailable} unit(s) available across all warehouses (requested ${params.quantity})`
    );
  }
  append({
    variantId: params.variantId,
    warehouse: target.warehouse,
    bucket: "reserved",
    quantity: params.quantity,
    type: "reservation",
    reason: null,
    reference: params.reference,
    actorId: params.actorId,
  });
  return target.warehouse;
}

export function releaseReservation(params: {
  variantId: string;
  warehouse: Warehouse;
  quantity: number;
  reference: string;
  actorId: string;
}): void {
  append({
    variantId: params.variantId,
    warehouse: params.warehouse,
    bucket: "reserved",
    quantity: -params.quantity,
    type: "release",
    reason: null,
    reference: params.reference,
    actorId: params.actorId,
  });
}

/** Converts a hold into a permanent decrement — called when an order ships. */
export function fulfillReservation(params: {
  variantId: string;
  warehouse: Warehouse;
  quantity: number;
  reference: string;
  actorId: string;
}): void {
  append({
    variantId: params.variantId,
    warehouse: params.warehouse,
    bucket: "reserved",
    quantity: -params.quantity,
    type: "fulfilled",
    reason: null,
    reference: params.reference,
    actorId: params.actorId,
  });
  append({
    variantId: params.variantId,
    warehouse: params.warehouse,
    bucket: "on_hand",
    quantity: -params.quantity,
    type: "fulfilled",
    reason: null,
    reference: params.reference,
    actorId: params.actorId,
  });
}

export function seedInitialStock(params: { variantId: string; warehouse: Warehouse; quantity: number; actorId: string }): void {
  append({
    variantId: params.variantId,
    warehouse: params.warehouse,
    bucket: "on_hand",
    quantity: params.quantity,
    type: "initial",
    reason: "Initial stock on product creation",
    reference: null,
    actorId: params.actorId,
  });
}
