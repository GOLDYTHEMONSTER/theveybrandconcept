import { randomUUID } from "crypto";
import { ConflictError, NotFoundError, ValidationError } from "../shared/errors";
import type { Warehouse } from "../shared/warehouses";
import { listVariants } from "../catalog/store";
import { fulfillReservation, releaseReservation, reserveStock } from "../inventory/store";
import type {
  Carrier,
  Channel,
  CreateOrderInput,
  Order,
  OrderEvent,
  OrderStatus,
  Shipment,
  ShipmentEvent,
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

function seedState(): OrdersState {
  const variants = listVariants();
  const findVariant = (sku: string) => variants.find((v) => v.sku === sku)!;

  const state: OrdersState = { orders: [], shipments: [], counter: 2049 };

  const seedOrder = (params: {
    orderNumber: string;
    customer: string;
    channel: Channel;
    status: OrderStatus;
    sku: string;
    quantity: number;
    placedHoursAgo: number;
  }) => {
    const variant = findVariant(params.sku);
    const now = Date.now();
    const placedAt = new Date(now - params.placedHoursAgo * 3600_000).toISOString();
    const warehouse = reserveStock({
      variantId: variant.id,
      quantity: params.quantity,
      reference: params.orderNumber,
      actorId: "sandbox-executive",
    });

    const item = {
      variantId: variant.id,
      productName: variant.productName,
      variantLabel: [variant.size, variant.color].filter(Boolean).join(" · "),
      sku: variant.sku,
      quantity: params.quantity,
      unitPrice: variant.price,
      warehouse,
    };

    const order: Order = {
      id: randomUUID(),
      orderNumber: params.orderNumber,
      organizationId: ORGANIZATION_ID,
      customer: params.customer,
      channel: params.channel,
      status: "pending",
      items: [item],
      total: item.unitPrice * item.quantity,
      createdBy: "sandbox-sales",
      createdAt: placedAt,
      events: [buildEvent(null, "pending", "sandbox-sales", null)],
      shipmentId: null,
    };

    // Fast-forward through the lifecycle for seed data so history looks real.
    const path: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];
    const targetIndex = path.indexOf(params.status);
    for (let i = 1; i <= targetIndex; i += 1) {
      const from = path[i - 1];
      const to = path[i];
      if (to === "cancelled") {
        releaseReservation({ variantId: variant.id, warehouse, quantity: item.quantity, reference: order.orderNumber, actorId: "sandbox-sales" });
      } else if (to === "shipped") {
        fulfillReservation({ variantId: variant.id, warehouse, quantity: item.quantity, reference: order.orderNumber, actorId: "sandbox-warehouse" });
        const shipment: Shipment = {
          id: randomUUID(),
          orderId: order.id,
          carrier: "GIG Logistics",
          trackingNumber: `GIG${Math.floor(100000 + Math.random() * 899999)}`,
          publicToken: randomUUID().replace(/-/g, "").slice(0, 16),
          createdAt: new Date().toISOString(),
          events: [
            { id: randomUUID(), status: "Label created", location: "Lagos showroom", message: "Shipping label generated", occurredAt: new Date().toISOString() },
            { id: randomUUID(), status: "In transit", location: "Lagos", message: "Package picked up by carrier", occurredAt: new Date().toISOString() },
          ],
        };
        state.shipments.push(shipment);
        order.shipmentId = shipment.id;
      } else if (to === "delivered") {
        const shipment = state.shipments.find((s) => s.id === order.shipmentId);
        shipment?.events.push({ id: randomUUID(), status: "Delivered", location: params.customer, message: "Delivered to customer", occurredAt: new Date().toISOString() });
      }
      order.status = to;
      order.events.push(buildEvent(from, to, to === "shipped" ? "sandbox-warehouse" : "sandbox-sales", null));
    }

    state.orders.push(order);
  };

  seedOrder({ orderNumber: "VY-2049", customer: "Chioma Eze", channel: "Online store", status: "pending", sku: "VY-SIENNA-GOWN", quantity: 1, placedHoursAgo: 0.1 });
  seedOrder({ orderNumber: "VY-2048", customer: "Ngozi Umeh", channel: "Lagos showroom", status: "processing", sku: "VY-ATELIER-SET", quantity: 1, placedHoursAgo: 0.4 });
  seedOrder({ orderNumber: "VY-2047", customer: "Blessing Okoro", channel: "Online store", status: "shipped", sku: "VY-VELVET-SHIFT", quantity: 1, placedHoursAgo: 1 });
  seedOrder({ orderNumber: "VY-2046", customer: "Amaka Nwosu", channel: "Online store", status: "delivered", sku: "CSV-9771141", quantity: 2, placedHoursAgo: 26 });
  seedOrder({ orderNumber: "VY-2045", customer: "Funmi Adisa", channel: "Lagos showroom", status: "cancelled", sku: "CSV-9967993", quantity: 1, placedHoursAgo: 27 });
  seedOrder({ orderNumber: "VY-2044", customer: "Ijeoma Chukwu", channel: "Online store", status: "delivered", sku: "CSV-9779896", quantity: 1, placedHoursAgo: 48 });

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
    channel: input.channel,
    status: "pending",
    items,
    total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    createdBy: actorId,
    createdAt: new Date().toISOString(),
    events: [buildEvent(null, "pending", actorId, null)],
    shipmentId: null,
  };

  state().orders.push(order);
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

export function addShipmentEvent(orderId: string, params: { status: string; location: string | null; message: string }, actorId: string): Shipment {
  const order = requireOrder(orderId);
  const shipment = order.shipmentId ? getShipment(order.shipmentId) : undefined;
  if (!shipment) throw new NotFoundError("This order does not have a shipment yet");
  shipment.events.push({ id: randomUUID(), ...params, occurredAt: new Date().toISOString() });
  return shipment;
}
