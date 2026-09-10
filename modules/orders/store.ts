import { randomUUID } from "crypto";
import { recordAudit } from "../audit/sandbox-log";
import { ConflictError, NotFoundError, ValidationError } from "../shared/errors";
import { createSeededRandom, stableId, stableToken } from "../shared/seeded-random";
import type { Warehouse } from "../shared/warehouses";
import { listVariants } from "../catalog/store";
import { fulfillReservation, getStockTotals, releaseReservation, reserveStock } from "../inventory/store";
import {
  CARRIERS,
  type Carrier,
  type Channel,
  type CreateOrderInput,
  type Order,
  type OrderEvent,
  type OrderStatus,
  type Shipment,
} from "./domain";

const ORGANIZATION_ID = "theveybrand-sandbox";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

interface OrdersState {
  orders: Order[];
  shipments: Shipment[];
  counter: number;
}

function actorName(actorId: string): string {
  const known: Record<string, string> = {
    "sandbox-executive": "Veronica Young",
    "sandbox-sales": "Amara Okafor",
    "sandbox-warehouse": "David Chen",
    "sandbox-support": "Ife Bello",
  };
  return known[actorId] ?? actorId;
}

function buildEvent(fromStatus: OrderStatus | null, toStatus: OrderStatus, actorId: string, note: string | null): OrderEvent {
  return {
    id: randomUUID(),
    fromStatus,
    toStatus,
    actorId,
    actorName: actorName(actorId),
    note,
    occurredAt: new Date().toISOString(),
  };
}

const DAY_MS = 24 * 3600_000;

// A wide customer pool with deliberate repeats -- some names appear many
// times (so CRM has real VIP/returning segments to show), most appear once
// or twice (so "new customer" trends are genuine, not a handful of the same
// six people re-ordering forever).
const CUSTOMER_POOL = [
  "Chioma Eze", "Chioma Eze", "Chioma Eze", "Ngozi Umeh", "Ngozi Umeh", "Ngozi Umeh", "Ngozi Umeh",
  "Blessing Okoro", "Blessing Okoro", "Amaka Nwosu", "Amaka Nwosu", "Amaka Nwosu",
  "Funmi Adisa", "Ijeoma Chukwu", "Ijeoma Chukwu", "Tolu Bankole",
  "Ifeoma Nnaji", "Grace Okafor", "Halima Yusuf", "Adaeze Obi", "Kemi Balogun",
  "Chinwe Okeke", "Yetunde Adebayo", "Uche Anyanwu", "Zainab Bello", "Temitope Ajayi",
  "Nkechi Uba", "Folake Adeyemi", "Chidinma Eze", "Bimpe Solanke", "Onyekachi Obiora",
  "Ruth Adeleke", "Maryam Suleiman", "Ebele Chukwuemeka", "Titilayo Fashola", "Precious Etim",
];

const CUSTOMER_EMAIL: Record<string, string> = {};
function emailFor(name: string): string {
  if (!CUSTOMER_EMAIL[name]) {
    CUSTOMER_EMAIL[name] = `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
  }
  return CUSTOMER_EMAIL[name];
}

/**
 * All "randomness" in this file's seed data comes from this one seeded
 * stream so a cold start on a different serverless instance reproduces
 * byte-identical orders (same ids, same customers, same statuses) rather
 * than a fresh random draw -- see modules/shared/seeded-random.ts.
 */
const seedRand = createSeededRandom("theveybrand-orders-seed-v1");
function randomInt(min: number, max: number): number {
  return Math.floor(seedRand() * (max - min + 1)) + min;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(seedRand() * items.length)];
}

function seedState(): OrdersState {
  const variants = listVariants();

  const state: OrdersState = { orders: [], shipments: [], counter: 1999 };
  let seedIndex = 0;

  /** Any variant with enough available stock right now for a seed order of this size -- checked live since earlier seed orders in this same pass draw stock down. */
  function pickAvailableVariant(quantity: number) {
    const candidates = variants.filter((v) => getStockTotals(v.id).available >= quantity);
    return candidates.length ? pick(candidates) : undefined;
  }

  const seedOrder = (params: {
    customer: string;
    channel: Channel;
    status: OrderStatus;
    daysAgo: number;
    withEmail: boolean;
  }) => {
    const index = seedIndex++;
    const quantity = seedRand() < 0.8 ? 1 : 2;
    const variant = pickAvailableVariant(quantity);
    if (!variant) return; // stock exhausted across the board -- skip rather than fail the whole seed

    const warehouse = reserveStock({
      variantId: variant.id,
      quantity,
      reference: `seed-${index}`,
      actorId: "sandbox-executive",
    });

    state.counter += 1;
    const orderNumber = `VY-${state.counter}`;
    const placedAt = new Date(Date.now() - params.daysAgo * DAY_MS - randomInt(0, 23) * 3600_000).toISOString();

    const item = {
      variantId: variant.id,
      productName: variant.productName,
      variantLabel: [variant.size, variant.color].filter(Boolean).join(" · "),
      sku: variant.sku,
      quantity,
      unitPrice: variant.price,
      warehouse,
    };

    const order: Order = {
      id: stableId(`order-seed-${index}`),
      orderNumber,
      organizationId: ORGANIZATION_ID,
      customer: params.customer,
      customerEmail: params.withEmail ? emailFor(params.customer) : null,
      channel: params.channel,
      status: "pending",
      items: [item],
      total: item.unitPrice * item.quantity,
      createdBy: params.channel === "Online store" ? "storefront-customer" : "sandbox-sales",
      createdAt: placedAt,
      events: [buildEvent(null, "pending", params.channel === "Online store" ? "storefront-customer" : "sandbox-sales", null)],
      shipmentId: null,
      paymentStatus: params.status === "pending" ? "unpaid" : params.status === "cancelled" ? "refunded" : "paid",
      paymentIntentId: null,
      recoveryToken: stableToken(`order-recovery-${index}`),
      paymentClientSecret: null,
    };

    recordAudit({
      action: params.channel === "Online store" ? "storefront.checkout" : "orders.create",
      entityType: "order",
      entityId: order.id,
      actorId: order.createdBy,
      actorName: params.channel === "Online store" ? params.customer : "Amara Okafor",
      afterValue: { orderNumber: order.orderNumber, customer: order.customer, total: order.total },
      occurredAt: placedAt,
    });

    // Fast-forward through the lifecycle for seed data so history looks real.
    const path: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];
    const targetIndex = path.indexOf(params.status);
    let stageAt = new Date(placedAt).getTime();
    for (let i = 1; i <= targetIndex; i += 1) {
      const from = path[i - 1];
      const to = path[i];
      stageAt = Math.min(stageAt + randomInt(4, 30) * 3600_000, Date.now());
      const stageIso = new Date(stageAt).toISOString();

      if (to === "cancelled") {
        releaseReservation({ variantId: variant.id, warehouse, quantity: item.quantity, reference: order.orderNumber, actorId: "sandbox-sales" });
      } else if (to === "shipped") {
        fulfillReservation({ variantId: variant.id, warehouse, quantity: item.quantity, reference: order.orderNumber, actorId: "sandbox-warehouse" });
        const carrier = pick(CARRIERS);
        const shipment: Shipment = {
          id: stableId(`shipment-seed-${index}`),
          orderId: order.id,
          carrier,
          trackingNumber: `${carrier.slice(0, 3).toUpperCase()}${randomInt(100000, 999999)}`,
          publicToken: stableToken(`shipment-public-${index}`, 16),
          createdAt: stageIso,
          events: [
            { id: randomUUID(), status: "Label created", location: warehouse, message: "Shipping label generated", occurredAt: stageIso },
            { id: randomUUID(), status: "In transit", location: warehouse === "Lagos showroom" ? "Lagos" : "Guangzhou", message: "Package picked up by carrier", occurredAt: stageIso },
          ],
        };
        state.shipments.push(shipment);
        order.shipmentId = shipment.id;
      } else if (to === "delivered") {
        const shipment = state.shipments.find((s) => s.id === order.shipmentId);
        shipment?.events.push({ id: randomUUID(), status: "Delivered", location: params.customer, message: "Delivered to customer", occurredAt: stageIso });
      }
      order.status = to;
      order.events.push(buildEvent(from, to, to === "shipped" ? "sandbox-warehouse" : "sandbox-sales", null));

      if (to === "shipped" || to === "delivered" || to === "cancelled") {
        recordAudit({
          action: to === "shipped" ? "orders.ship" : to === "delivered" ? "orders.deliver" : "orders.cancel",
          entityType: "order",
          entityId: order.id,
          actorId: to === "shipped" ? "sandbox-warehouse" : "sandbox-sales",
          actorName: to === "shipped" ? "David Chen" : "Amara Okafor",
          afterValue: { orderNumber: order.orderNumber, status: order.status, carrier: order.shipmentId ? state.shipments.find((s) => s.id === order.shipmentId)?.carrier : undefined },
          occurredAt: stageIso,
        });
      }
    }

    state.orders.push(order);
  };

  // ~35 days of order history, weighted toward the last two weeks so
  // week-over-week trends have real signal and the business looks like
  // it's growing rather than flatlined.
  for (let daysAgo = 34; daysAgo >= 0; daysAgo -= 1) {
    const ordersToday = daysAgo > 14 ? randomInt(0, 2) : daysAgo > 3 ? randomInt(1, 4) : randomInt(2, 5);
    for (let i = 0; i < ordersToday; i += 1) {
      const channel: Channel = seedRand() < 0.68 ? "Online store" : "Lagos showroom";
      let status: OrderStatus;
      if (daysAgo === 0) status = pick(["pending", "pending", "processing"] as const);
      else if (daysAgo <= 2) status = pick(["pending", "processing", "processing", "shipped"] as const);
      else if (daysAgo <= 5) status = pick(["processing", "shipped", "shipped", "delivered", "cancelled"] as const);
      else status = pick(["delivered", "delivered", "delivered", "delivered", "shipped", "cancelled"] as const);

      seedOrder({
        customer: pick(CUSTOMER_POOL),
        channel,
        status,
        daysAgo,
        withEmail: channel === "Online store" || seedRand() < 0.4,
      });
    }
  }

  // A handful of abandoned checkouts for the Recovery tool -- reached
  // Stripe's payment step and never completed it, at various ages so the
  // "oldest" metric has something real to say.
  const abandonedAges = [0.3, 2, 9, 26];
  for (const hoursAgo of abandonedAges) {
    const index = seedIndex++;
    const variant = pickAvailableVariant(1);
    if (!variant) continue;
    const warehouse = reserveStock({ variantId: variant.id, quantity: 1, reference: "abandoned-checkout", actorId: "sandbox-sales" });
    state.counter += 1;
    const customer = pick(CUSTOMER_POOL);
    const placedAt = new Date(Date.now() - hoursAgo * 3600_000).toISOString();
    state.orders.push({
      id: stableId(`order-seed-${index}`),
      orderNumber: `VY-${state.counter}`,
      organizationId: ORGANIZATION_ID,
      customer,
      customerEmail: emailFor(customer),
      channel: "Online store",
      status: "pending",
      items: [{
        variantId: variant.id,
        productName: variant.productName,
        variantLabel: [variant.size, variant.color].filter(Boolean).join(" · "),
        sku: variant.sku,
        quantity: 1,
        unitPrice: variant.price,
        warehouse,
      }],
      total: variant.price,
      createdBy: "storefront-customer",
      createdAt: placedAt,
      events: [buildEvent(null, "pending", "storefront-customer", null)],
      shipmentId: null,
      paymentStatus: "processing",
      paymentIntentId: `pi_seed_abandoned_${state.counter}`,
      recoveryToken: stableToken(`order-recovery-${index}`),
      paymentClientSecret: null,
    });
  }

  return state;
}

const globalOrders = globalThis as typeof globalThis & { __veyOrders?: OrdersState };
if (!globalOrders.__veyOrders) {
  globalOrders.__veyOrders = seedState();
}

function state(): OrdersState {
  return globalOrders.__veyOrders!;
}

export function listOrders(): Order[] {
  return [...state().orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getOrder(orderId: string): Order | undefined {
  return state().orders.find((order) => order.id === orderId);
}

export function requireOrder(orderId: string): Order {
  const order = getOrder(orderId);
  if (!order) throw new NotFoundError("Order not found");
  return order;
}

export function getShipment(shipmentId: string): Shipment | undefined {
  return state().shipments.find((s) => s.id === shipmentId);
}

export function getShipmentByToken(token: string): { order: Order; shipment: Shipment } | undefined {
  const shipment = state().shipments.find((s) => s.publicToken === token);
  if (!shipment) return undefined;
  const order = state().orders.find((o) => o.id === shipment.orderId);
  if (!order) return undefined;
  return { order, shipment };
}

export function createOrder(input: CreateOrderInput, actorId: string): Order {
  const variants = listVariants();
  const items = input.items.map((line) => {
    const variant = variants.find((v) => v.id === line.variantId);
    if (!variant) throw new ValidationError("Selected product is no longer available");
    const warehouse = reserveStock({
      variantId: variant.id,
      quantity: line.quantity,
      reference: "pending-order",
      actorId,
    });
    return {
      variantId: variant.id,
      productName: variant.productName,
      variantLabel: [variant.size, variant.color].filter(Boolean).join(" · "),
      sku: variant.sku,
      quantity: line.quantity,
      unitPrice: variant.price,
      warehouse,
    };
  });

  state().counter += 1;
  const orderNumber = `VY-${state().counter}`;

  const order: Order = {
    id: randomUUID(),
    orderNumber,
    organizationId: ORGANIZATION_ID,
    customer: input.customer,
    customerEmail: input.customerEmail ?? null,
    channel: input.channel,
    status: "pending",
    items,
    total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    createdBy: actorId,
    createdAt: new Date().toISOString(),
    events: [buildEvent(null, "pending", actorId, null)],
    shipmentId: null,
    paymentStatus: "unpaid",
    paymentIntentId: null,
    recoveryToken: randomUUID().replace(/-/g, ""),
    paymentClientSecret: null,
  };

  state().orders.push(order);
  return order;
}

export function findOrderByRecoveryToken(token: string): Order | undefined {
  return state().orders.find((order) => order.recoveryToken === token);
}

const ABANDONED_THRESHOLD_MINUTES = 15;

/**
 * A "processing" payment that's been stuck for a while with the order
 * still "pending" -- the customer reached Stripe's payment step and
 * never finished it. Recent ones (still inside the window) aren't
 * "abandoned" yet, just mid-checkout.
 */
export function getAbandonedCheckouts(): Order[] {
  const cutoff = Date.now() - ABANDONED_THRESHOLD_MINUTES * 60_000;
  return state()
    .orders.filter((order) => order.status === "pending" && order.paymentStatus === "processing" && new Date(order.createdAt).getTime() < cutoff)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export function attachPaymentIntent(orderId: string, paymentIntentId: string, clientSecret: string | null): Order {
  const order = requireOrder(orderId);
  order.paymentIntentId = paymentIntentId;
  order.paymentClientSecret = clientSecret;
  order.paymentStatus = "processing";
  return order;
}

export function findOrderByPaymentIntent(paymentIntentId: string): Order | undefined {
  return state().orders.find((order) => order.paymentIntentId === paymentIntentId);
}

/**
 * Stripe is the source of truth for payment state -- these three only
 * run from the webhook handler (app/api/webhooks/stripe), never from a
 * client request, and are idempotent against Stripe's at-least-once
 * delivery (a retried event for an already-settled order is a no-op).
 */
export function markPaymentSucceeded(orderId: string, actorId = "stripe-webhook"): Order {
  const order = requireOrder(orderId);
  if (order.paymentStatus === "paid") return order;
  order.paymentStatus = "paid";
  if (order.status === "pending") {
    order.status = "processing";
    order.events.push(buildEvent("pending", "processing", actorId, "Payment confirmed via Stripe"));
  }
  return order;
}

export function markPaymentFailed(orderId: string, actorId = "stripe-webhook"): Order {
  const order = requireOrder(orderId);
  if (order.paymentStatus === "failed" || order.status === "cancelled") return order;
  order.paymentStatus = "failed";
  for (const item of order.items) {
    releaseReservation({
      variantId: item.variantId,
      warehouse: item.warehouse as Warehouse,
      quantity: item.quantity,
      reference: order.orderNumber,
      actorId,
    });
  }
  const fromStatus = order.status;
  order.status = "cancelled";
  order.events.push(buildEvent(fromStatus, "cancelled", actorId, "Payment failed via Stripe"));
  return order;
}

export function markPaymentRefunded(orderId: string, actorId = "stripe-webhook"): Order {
  const order = requireOrder(orderId);
  if (order.paymentStatus === "refunded") return order;
  order.paymentStatus = "refunded";
  if (order.status !== "cancelled" && order.status !== "delivered") {
    for (const item of order.items) {
      releaseReservation({
        variantId: item.variantId,
        warehouse: item.warehouse as Warehouse,
        quantity: item.quantity,
        reference: order.orderNumber,
        actorId,
      });
    }
    const fromStatus = order.status;
    order.status = "cancelled";
    order.events.push(buildEvent(fromStatus, "cancelled", actorId, "Refunded via Stripe"));
  } else {
    order.events.push(buildEvent(order.status, order.status, actorId, "Refunded via Stripe"));
  }
  return order;
}

function assertTransition(order: Order, to: OrderStatus): void {
  if (!ALLOWED_TRANSITIONS[order.status].includes(to)) {
    throw new ConflictError(`Cannot move order from "${order.status}" to "${to}"`);
  }
}

export function startProcessing(orderId: string, actorId: string): Order {
  const order = requireOrder(orderId);
  assertTransition(order, "processing");
  order.status = "processing";
  order.events.push(buildEvent("pending", "processing", actorId, null));
  return order;
}

export function cancelOrder(orderId: string, actorId: string, reason: string | null): Order {
  const order = requireOrder(orderId);
  assertTransition(order, "cancelled");
  const fromStatus = order.status;
  for (const item of order.items) {
    releaseReservation({
      variantId: item.variantId,
      warehouse: item.warehouse as Warehouse,
      quantity: item.quantity,
      reference: order.orderNumber,
      actorId,
    });
  }
  order.status = "cancelled";
  order.events.push(buildEvent(fromStatus, "cancelled", actorId, reason));
  return order;
}

export function shipOrder(orderId: string, params: { carrier: Carrier; trackingNumber: string }, actorId: string): Order {
  const order = requireOrder(orderId);
  assertTransition(order, "shipped");

  for (const item of order.items) {
    fulfillReservation({
      variantId: item.variantId,
      warehouse: item.warehouse as Warehouse,
      quantity: item.quantity,
      reference: order.orderNumber,
      actorId,
    });
  }

  const shipment: Shipment = {
    id: randomUUID(),
    orderId: order.id,
    carrier: params.carrier,
    trackingNumber: params.trackingNumber,
    publicToken: randomUUID().replace(/-/g, "").slice(0, 16),
    createdAt: new Date().toISOString(),
    events: [
      { id: randomUUID(), status: "Label created", location: order.items[0]?.warehouse ?? null, message: `Handed to ${params.carrier}`, occurredAt: new Date().toISOString() },
    ],
  };
  state().shipments.push(shipment);

  order.shipmentId = shipment.id;
  order.status = "shipped";
  order.events.push(buildEvent("processing", "shipped", actorId, `${params.carrier} · ${params.trackingNumber}`));
  return order;
}

export function markDelivered(orderId: string, actorId: string): Order {
  const order = requireOrder(orderId);
  assertTransition(order, "delivered");
  order.status = "delivered";
  order.events.push(buildEvent("shipped", "delivered", actorId, null));
  const shipment = order.shipmentId ? getShipment(order.shipmentId) : undefined;
  shipment?.events.push({ id: randomUUID(), status: "Delivered", location: order.customer, message: "Delivered to customer", occurredAt: new Date().toISOString() });
  return order;
}

export function addShipmentEvent(orderId: string, params: { status: string; location: string | null; message: string }): Shipment {
  const order = requireOrder(orderId);
  const shipment = order.shipmentId ? getShipment(order.shipmentId) : undefined;
  if (!shipment) throw new NotFoundError("This order does not have a shipment yet");
  shipment.events.push({ id: randomUUID(), ...params, occurredAt: new Date().toISOString() });
  return shipment;
}

export function findShipmentByTrackingNumber(trackingNumber: string): { order: Order; shipment: Shipment } | undefined {
  const shipment = state().shipments.find((s) => s.trackingNumber === trackingNumber);
  if (!shipment) return undefined;
  const order = state().orders.find((o) => o.id === shipment.orderId);
  if (!order) return undefined;
  return { order, shipment };
}

const DELIVERED_STATUS_ALIASES = new Set(["delivered", "delivery_confirmed", "completed"]);

/**
 * The one entry point both the real carrier webhook (app/api/webhooks/
 * shipping, authenticated by shared secret -- no logistics provider is
 * wired up yet, see the "Simulate for now" scope) and the ERP's
 * "Simulate carrier update" button (session-authenticated staff action)
 * go through, so the two paths can never drift. A real GIG Logistics /
 * Shippo / etc. integration replaces the webhook route's payload
 * parsing, not this function.
 */
export function recordCarrierEvent(
  trackingNumber: string,
  params: { status: string; location: string | null; message: string },
  actorId = "carrier-webhook"
): { order: Order; shipment: Shipment } {
  const found = findShipmentByTrackingNumber(trackingNumber);
  if (!found) throw new NotFoundError(`No shipment found for tracking number ${trackingNumber}`);
  const { order, shipment } = found;

  shipment.events.push({ id: randomUUID(), status: params.status, location: params.location, message: params.message, occurredAt: new Date().toISOString() });

  if (DELIVERED_STATUS_ALIASES.has(params.status.toLowerCase()) && order.status === "shipped") {
    order.status = "delivered";
    order.events.push(buildEvent("shipped", "delivered", actorId, params.message));
  }

  return { order, shipment };
}
