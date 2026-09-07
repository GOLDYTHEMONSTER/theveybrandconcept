import { ValidationError } from "../shared/errors";
import { CARRIERS, CHANNELS, type Carrier, type Channel, type CreateOrderInput, type ShipOrderInput } from "./domain";

function requiredString(value: unknown, field: string, { min = 1, max = 200 } = {}): string {
  if (typeof value !== "string" || value.trim().length < min) {
    throw new ValidationError(`${field} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ValidationError(`${field} must be ${max} characters or fewer`);
  return trimmed;
}

export function parseCreateOrderInput(input: unknown): CreateOrderInput {
  if (!input || typeof input !== "object") throw new ValidationError("Order details are required");
  const candidate = input as Record<string, unknown>;

  const customer = requiredString(candidate.customer, "Customer name", { min: 2, max: 120 });

  const channel = requiredString(candidate.channel, "Channel") as Channel;
  if (!CHANNELS.includes(channel)) throw new ValidationError(`Channel must be one of: ${CHANNELS.join(", ")}`);

  if (!Array.isArray(candidate.items) || candidate.items.length === 0) {
    throw new ValidationError("At least one order item is required");
  }

  const items = candidate.items.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new ValidationError(`Item ${index + 1} is invalid`);
    const item = raw as Record<string, unknown>;
    const variantId = requiredString(item.variantId, `Item ${index + 1} product`);
    const quantity = typeof item.quantity === "string" ? Number(item.quantity) : item.quantity;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
      throw new ValidationError(`Item ${index + 1} quantity must be a whole number of at least 1`);
    }
    return { variantId, quantity };
  });

  return { customer, channel, items };
}

export function parseShipOrderInput(input: unknown): ShipOrderInput {
  if (!input || typeof input !== "object") throw new ValidationError("Tracking details are required");
  const candidate = input as Record<string, unknown>;

  const carrier = requiredString(candidate.carrier, "Carrier") as Carrier;
  if (!CARRIERS.includes(carrier)) throw new ValidationError(`Carrier must be one of: ${CARRIERS.join(", ")}`);

  const trackingNumber = requiredString(candidate.trackingNumber, "Tracking number", { min: 4, max: 60 });

  return { carrier, trackingNumber };
}

export function parseReason(input: unknown, field = "Reason"): string | null {
  if (input === undefined || input === null || input === "") return null;
  return requiredString(input, field, { min: 1, max: 500 });
}
