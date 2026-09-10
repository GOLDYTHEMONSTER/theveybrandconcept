import { randomUUID } from "crypto";
import { recordAudit } from "../audit/sandbox-log";
import { adjustStock } from "../inventory/store";
import { getOrder, listOrders, requireOrder } from "../orders/store";
import { ConflictError, NotFoundError, ValidationError } from "../shared/errors";
import type { Warehouse } from "../shared/warehouses";
import { RETURN_REASONS, type CreateReturnInput, type ReturnEvent, type ReturnReason, type ReturnRequest, type ReturnStatus } from "./domain";

interface ReturnsState {
  returns: ReturnRequest[];
  counter: number;
}

const globalReturns = globalThis as typeof globalThis & { __veyReturns?: ReturnsState };

function actorName(actorId: string): string {
  const known: Record<string, string> = {
    "sandbox-executive": "Veronica Young",
    "sandbox-sales": "Amara Okafor",
    "sandbox-warehouse": "David Chen",
    "sandbox-support": "Ife Bello",
    "storefront-customer": "Customer (self-service)",
  };
  return known[actorId] ?? actorId;
}

function buildEvent(fromStatus: ReturnStatus | null, toStatus: ReturnStatus, actorId: string, note: string | null, occurredAt = new Date().toISOString()): ReturnEvent {
  return { id: randomUUID(), fromStatus, toStatus, actorId, actorName: actorName(actorId), note, occurredAt };
}

const DAY_MS = 24 * 3600_000;
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Seeds a realistic spread of return requests against real delivered
 * orders -- roughly a fifth of delivered orders get one, across every
 * status, so the Returns page (and every dashboard/analytics number
 * derived from it) has real history instead of starting empty until a
 * live action creates the first one.
 */
function seedReturns(counter: { value: number }): ReturnRequest[] {
  const deliveredOrders = listOrders().filter((order) => order.status === "delivered" && order.paymentStatus === "paid");
  if (!deliveredOrders.length) return [];

  const targetCount = Math.min(16, Math.max(4, Math.round(deliveredOrders.length * 0.22)));
  const chosen = [...deliveredOrders].sort(() => Math.random() - 0.5).slice(0, targetCount);
  const STATUS_WEIGHTS: ReturnStatus[] = ["requested", "requested", "requested", "approved", "approved", "received", "refunded", "refunded", "refunded", "rejected"];
  const seeded: ReturnRequest[] = [];

  for (const order of chosen) {
    const orderPlacedAt = new Date(order.createdAt).getTime();
    const ageMs = Date.now() - orderPlacedAt;
    if (ageMs < 2 * DAY_MS) continue; // too recent to plausibly already have a return in motion

    const item = pick(order.items);
    const reason = pick(RETURN_REASONS) as ReturnReason;
    const status = pick(STATUS_WEIGHTS);
    const requestedAt = Math.min(orderPlacedAt + randomInt(1, 2) * DAY_MS, Date.now() - DAY_MS);

    counter.value += 1;
    const returnNumber = `RTN-${counter.value}`;
    const refundAmount = item.unitPrice * 1;

    const events: ReturnEvent[] = [buildEvent(null, "requested", "sandbox-support", null, new Date(requestedAt).toISOString())];
    let cursor = requestedAt;

    if (status === "rejected") {
      cursor = Math.min(cursor + randomInt(4, 20) * 3600_000, Date.now());
      events.push(buildEvent("requested", "rejected", "sandbox-support", "Outside the return window", new Date(cursor).toISOString()));
    } else {
      const path: ReturnStatus[] = ["requested", "approved", "received", "refunded"];
      const targetIndex = path.indexOf(status);
      const actorByStage: Record<string, string> = { approved: "sandbox-support", received: "sandbox-warehouse", refunded: "sandbox-executive" };
      for (let i = 1; i <= targetIndex; i += 1) {
        const to = path[i];
        cursor = Math.min(cursor + randomInt(12, 48) * 3600_000, Date.now());
        events.push(buildEvent(path[i - 1], to, actorByStage[to], null, new Date(cursor).toISOString()));
        if (to === "received") {
          adjustStock({ variantId: item.variantId, warehouse: item.warehouse as Warehouse, quantityDelta: 1, reason: `Customer return ${returnNumber}`, actorId: "sandbox-warehouse" });
        }
      }
    }

    const request: ReturnRequest = {
      id: randomUUID(),
      returnNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      reason,
      reasonNote: null,
      items: [{ ...item, quantity: 1 }],
      refundAmount,
      status,
      createdBy: "sandbox-support",
      createdAt: new Date(requestedAt).toISOString(),
      events,
      refundId: status === "refunded" ? `re_seed_${returnNumber}` : null,
    };

    recordAudit({ action: "returns.create", entityType: "return", entityId: request.id, actorId: "sandbox-support", actorName: "Ife Bello", afterValue: { returnNumber, refundAmount, reason }, occurredAt: new Date(requestedAt).toISOString() });
    for (const event of events.slice(1)) {
      const action = event.toStatus === "approved" ? "returns.approve" : event.toStatus === "rejected" ? "returns.reject" : event.toStatus === "received" ? "returns.receive" : "returns.refund";
      recordAudit({ action, entityType: "return", entityId: request.id, actorId: event.actorId, actorName: event.actorName, occurredAt: event.occurredAt });
    }

    seeded.push(request);
  }

  return seeded;
}

if (!globalReturns.__veyReturns) {
  const counter = { value: 1000 };
  const returns = seedReturns(counter);
  globalReturns.__veyReturns = { returns, counter: counter.value };
}

function state(): ReturnsState {
  return globalReturns.__veyReturns!;
}

export function listReturns(): ReturnRequest[] {
  return [...state().returns].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getReturn(id: string): ReturnRequest | undefined {
  return state().returns.find((r) => r.id === id);
}

export function requireReturn(id: string): ReturnRequest {
  const found = getReturn(id);
  if (!found) throw new NotFoundError("Return not found");
  return found;
}

export function listReturnsForOrder(orderId: string): ReturnRequest[] {
  return state().returns.filter((r) => r.orderId === orderId);
}

const ALLOWED_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["received"],
  rejected: [],
  received: ["refunded"],
  refunded: [],
};

function assertTransition(request: ReturnRequest, to: ReturnStatus): void {
  if (!ALLOWED_TRANSITIONS[request.status].includes(to)) {
    throw new ConflictError(`Cannot move this return from "${request.status}" to "${to}"`);
  }
}

/**
 * Either the storefront customer (via the public tracking page) or ERP
 * staff can call this -- the caller decides actorId. Only a delivered,
 * paid order can be returned, and a line's returnable quantity is
 * whatever hasn't already been claimed by a still-active return on the
 * same order (a rejected return frees its quantity back up).
 */
export function createReturn(input: CreateReturnInput, actorId: string, customerName?: string): ReturnRequest {
  const order = getOrder(input.orderId);
  if (!order) throw new NotFoundError("Order not found");
  if (order.status !== "delivered") throw new ValidationError("Only delivered orders can be returned");
  if (order.paymentStatus !== "paid") throw new ValidationError(`Cannot return an order with payment status "${order.paymentStatus}"`);
  if (!input.items.length) throw new ValidationError("Select at least one item to return");

  const alreadyReturned = new Map<string, number>();
  for (const existing of listReturnsForOrder(order.id)) {
    if (existing.status === "rejected") continue;
    for (const item of existing.items) {
      alreadyReturned.set(item.variantId, (alreadyReturned.get(item.variantId) ?? 0) + item.quantity);
    }
  }

  const items = input.items.map(({ variantId, quantity }) => {
    const orderItem = order.items.find((item) => item.variantId === variantId);
    if (!orderItem) throw new ValidationError("One of the selected items is not part of this order");
    if (!Number.isInteger(quantity) || quantity < 1) throw new ValidationError("Return quantity must be a whole number of at least 1");
    const claimed = alreadyReturned.get(variantId) ?? 0;
    const returnable = orderItem.quantity - claimed;
    if (quantity > returnable) {
      throw new ValidationError(`Only ${returnable} unit(s) of ${orderItem.productName} are still returnable`);
    }
    return {
      variantId: orderItem.variantId,
      productName: orderItem.productName,
      variantLabel: orderItem.variantLabel,
      sku: orderItem.sku,
      quantity,
      unitPrice: orderItem.unitPrice,
      warehouse: orderItem.warehouse,
    };
  });

  state().counter += 1;
  const returnNumber = `RTN-${state().counter}`;
  const refundAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const request: ReturnRequest = {
    id: randomUUID(),
    returnNumber,
    orderId: order.id,
    orderNumber: order.orderNumber,
    customer: customerName ?? order.customer,
    reason: input.reason,
    reasonNote: input.reasonNote,
    items,
    refundAmount,
    status: "requested",
    createdBy: actorId,
    createdAt: new Date().toISOString(),
    events: [buildEvent(null, "requested", actorId, input.reasonNote)],
    refundId: null,
  };

  state().returns.push(request);
  return request;
}

export function approveReturn(id: string, actorId: string): ReturnRequest {
  const request = requireReturn(id);
  assertTransition(request, "approved");
  request.status = "approved";
  request.events.push(buildEvent("requested", "approved", actorId, null));
  return request;
}

export function rejectReturn(id: string, actorId: string, note: string | null): ReturnRequest {
  const request = requireReturn(id);
  assertTransition(request, "rejected");
  request.status = "rejected";
  request.events.push(buildEvent("requested", "rejected", actorId, note));
  return request;
}

/** Restocks each returned line back into inventory -- the one place a return actually moves stock. */
export function markReturnReceived(id: string, actorId: string): ReturnRequest {
  const request = requireReturn(id);
  assertTransition(request, "received");
  for (const item of request.items) {
    adjustStock({
      variantId: item.variantId,
      warehouse: item.warehouse as Warehouse,
      quantityDelta: item.quantity,
      reason: `Customer return ${request.returnNumber}`,
      actorId,
    });
  }
  request.status = "received";
  request.events.push(buildEvent("approved", "received", actorId, null));
  return request;
}

export function markReturnRefunded(id: string, actorId: string, refundId: string): ReturnRequest {
  const request = requireReturn(id);
  assertTransition(request, "refunded");
  request.status = "refunded";
  request.refundId = refundId;
  request.events.push(buildEvent("received", "refunded", actorId, `Stripe refund ${refundId}`));
  return request;
}

export function getOrderForReturn(orderId: string) {
  return requireOrder(orderId);
}
