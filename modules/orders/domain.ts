export const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "processing", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CHANNELS = ["Online store", "Lagos showroom"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CARRIERS = ["GIG Logistics", "DHL", "Dellyman", "Local courier"] as const;
export type Carrier = (typeof CARRIERS)[number];

export interface OrderItem {
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  warehouse: string;
}

export interface OrderEvent {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorId: string;
  actorName: string;
  note: string | null;
  occurredAt: string;
}

export interface ShipmentEvent {
  id: string;
  status: string;
  location: string | null;
  message: string;
  occurredAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  carrier: Carrier;
  trackingNumber: string;
  publicToken: string;
  events: ShipmentEvent[];
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  organizationId: string;
  customer: string;
  channel: Channel;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  createdBy: string;
  createdAt: string;
  events: OrderEvent[];
  shipmentId: string | null;
  paymentStatus: PaymentStatus;
  paymentIntentId: string | null;
}

export interface CreateOrderItemInput {
  variantId: string;
  quantity: number;
}

export interface CreateOrderInput {
  customer: string;
  channel: Channel;
  items: CreateOrderItemInput[];
}

export interface ShipOrderInput {
  carrier: Carrier;
  trackingNumber: string;
}
